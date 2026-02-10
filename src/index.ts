import debounce from 'lodash.debounce';

import initialiseControlsUi from './controls-ui';
import { Circular2DBuffer } from './math-util';
import { DEFAULT_SYLLABLE, DEFAULT_GENDER, VoiceGender } from './pinyin-data';
import { SpectrogramGPURenderer, RenderParameters } from './spectrogram-render';
import { offThreadGenerateSpectrogram } from './worker-util';

const SPECTROGRAM_WINDOW_SIZE = 4096;
const SPECTROGRAM_WINDOW_OVERLAP = 1024;

interface SpectrogramBufferData {
    buffer: Float32Array;
    start: number;
    length: number;
    sampleRate: number;
    isStart: boolean;
}

const BUFFER_WIDTH_MULTIPLIER = 4;

interface SingleSpectrogramCallbacks {
    bufferCallback: (bufferData: SpectrogramBufferData) => Promise<Float32Array>;
    clearCallback: () => void;
    updateRenderParameters: (parameters: Partial<RenderParameters>) => void;
    setAutoScroll: (enabled: boolean) => void;
}

// Sets up a single spectrogram canvas with its own renderer and buffer
function setupSingleSpectrogram(canvasSelector: string): SingleSpectrogramCallbacks | null {
    const canvas = document.querySelector(canvasSelector) as HTMLCanvasElement | null;
    if (canvas === null || canvas.parentElement === null) {
        return null;
    }

    const canvasWidth = canvas.parentElement.offsetWidth;

    // Query max texture size to cap buffer width
    const tempCanvas = document.createElement('canvas');
    const tempGl = tempCanvas.getContext('webgl');
    const maxTextureSize = tempGl ? tempGl.getParameter(tempGl.MAX_TEXTURE_SIZE) as number : 4096;

    const bufferWidth = Math.min(canvasWidth * BUFFER_WIDTH_MULTIPLIER, maxTextureSize);

    const spectrogramBuffer = new Circular2DBuffer(
        Float32Array,
        bufferWidth,
        SPECTROGRAM_WINDOW_SIZE / 2,
        1
    );

    const renderer = new SpectrogramGPURenderer(
        canvas,
        spectrogramBuffer.width,
        spectrogramBuffer.height
    );
    renderer.resizeCanvas(canvasWidth, canvas.parentElement.offsetHeight);

    let imageDirty = false;

    // Scroll state
    let viewOffset = 0;
    let autoScroll = true;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartOffset = 0;

    const pixelsToNormalized = (px: number): number => {
        const zoom = renderer.getCurrentZoom();
        const w = canvas.clientWidth || canvas.width;
        return px / (w * zoom);
    };

    const clampViewOffset = (): void => {
        const maxOffset = spectrogramBuffer.length / spectrogramBuffer.width - 1 / renderer.getCurrentZoom();
        viewOffset = Math.max(0, Math.min(viewOffset, Math.max(0, maxOffset)));
    };

    const applyScroll = (): void => {
        if (viewOffset > 0.001) {
            autoScroll = false;
        } else {
            viewOffset = 0;
            autoScroll = true;
        }
        renderer.updateParameters({ viewOffset });
    };

    // Mouse wheel scroll
    canvas.addEventListener('wheel', (e: WheelEvent) => {
        e.preventDefault();
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        viewOffset += pixelsToNormalized(delta);
        clampViewOffset();
        applyScroll();
    }, { passive: false });

    // Mouse drag to pan
    canvas.addEventListener('mousedown', (e: MouseEvent) => {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartOffset = viewOffset;
        canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
        if (!isDragging) return;
        const dx = dragStartX - e.clientX;
        viewOffset = dragStartOffset + pixelsToNormalized(dx);
        clampViewOffset();
        applyScroll();
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            canvas.style.cursor = '';
        }
    });

    // Touch support
    let touchStartX = 0;
    let touchStartOffset = 0;
    canvas.addEventListener('touchstart', (e: TouchEvent) => {
        if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartOffset = viewOffset;
        }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e: TouchEvent) => {
        if (e.touches.length === 1) {
            e.preventDefault();
            const dx = touchStartX - e.touches[0].clientX;
            viewOffset = touchStartOffset + pixelsToNormalized(dx);
            clampViewOffset();
            applyScroll();
        }
    }, { passive: false });

    const bufferCallback = async (bufferData: SpectrogramBufferData): Promise<Float32Array> => {
        renderer.updateParameters({
            windowSize: SPECTROGRAM_WINDOW_SIZE,
            sampleRate: bufferData.sampleRate,
        });

        const spectrogram = await offThreadGenerateSpectrogram(
            bufferData.buffer,
            bufferData.start,
            bufferData.length,
            {
                windowSize: SPECTROGRAM_WINDOW_SIZE,
                windowStepSize: SPECTROGRAM_WINDOW_OVERLAP,
                sampleRate: bufferData.sampleRate,
                isStart: bufferData.isStart,
            }
        );
        spectrogramBuffer.enqueue(spectrogram.spectrogram);
        imageDirty = true;

        if (autoScroll) {
            viewOffset = 0;
            renderer.updateParameters({ viewOffset: 0 });
        }

        return spectrogram.input;
    };

    // Render loop
    const render = () => {
        if (imageDirty) {
            renderer.updateSpectrogram(spectrogramBuffer);
        }
        renderer.render();
        requestAnimationFrame(render);
    };
    requestAnimationFrame(render);

    // Handle resizing — buffer stays at fixed size, only canvas viewport changes
    const resizeHandler = debounce(() => {
        if (canvas.parentElement === null) return;
        renderer.resizeCanvas(
            canvas.parentElement.offsetWidth,
            canvas.parentElement.offsetHeight
        );
        renderer.updateSpectrogram(spectrogramBuffer);
    }, 250);
    window.addEventListener('resize', resizeHandler);

    window.addEventListener('resize', () => {
        if (canvas.parentElement === null) return;
        renderer.fastResizeCanvas(
            canvas.parentElement.offsetWidth,
            canvas.parentElement.offsetHeight
        );
    });

    return {
        bufferCallback,
        clearCallback: () => {
            spectrogramBuffer.clear();
            renderer.updateSpectrogram(spectrogramBuffer, true);
            viewOffset = 0;
            autoScroll = true;
            renderer.updateParameters({ viewOffset: 0 });
        },
        updateRenderParameters: (parameters: Partial<RenderParameters>) => {
            renderer.updateParameters(parameters);
        },
        setAutoScroll: (enabled: boolean) => {
            autoScroll = enabled;
            if (enabled) {
                viewOffset = 0;
                renderer.updateParameters({ viewOffset: 0 });
            }
        },
    };
}

async function setupSpectrogramFromMicrophone(
    audioCtx: AudioContext,
    bufferCallback: (bufferData: SpectrogramBufferData) => Promise<Float32Array>
) {
    const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const source = audioCtx.createMediaStreamSource(mediaStream);

    const processor = audioCtx.createScriptProcessor(SPECTROGRAM_WINDOW_OVERLAP, 1, 1);

    const channelBuffer: Float32Array[] = [];

    let sampleRate: number | null = null;
    let isStart = true;
    let bufferCallbackPromise: Promise<Float32Array> | null = null;
    const processChannelBuffer = () => {
        if (bufferCallbackPromise !== null) {
            return;
        }

        // Check if we have at least a full window to render yet
        if (channelBuffer.length < SPECTROGRAM_WINDOW_SIZE / SPECTROGRAM_WINDOW_OVERLAP) {
            return;
        }

        // Merge all the buffers we have so far into a single buffer for rendering
        const buffer = new Float32Array(channelBuffer.length * SPECTROGRAM_WINDOW_OVERLAP);
        for (let j = 0; j < channelBuffer.length; j += 1) {
            buffer.set(channelBuffer[j], SPECTROGRAM_WINDOW_OVERLAP * j);
        }

        // Delete the oldest buffers that aren't needed any more for the next render
        channelBuffer.splice(
            0,
            channelBuffer.length - SPECTROGRAM_WINDOW_SIZE / SPECTROGRAM_WINDOW_OVERLAP + 1
        );

        bufferCallbackPromise = bufferCallback({
            buffer,
            start: 0,
            length: buffer.length,
            sampleRate: sampleRate!,
            isStart,
        });
        bufferCallbackPromise.then(() => {
            bufferCallbackPromise = null;
        });
        isStart = false;
    };

    processor.addEventListener('audioprocess', (e) => {
        const inputBuffer = e.inputBuffer.getChannelData(0);
        channelBuffer.push(new Float32Array(inputBuffer));
        sampleRate = e.inputBuffer.sampleRate;
        processChannelBuffer();
    });

    source.connect(processor);
    processor.connect(audioCtx.destination);

    return () => {
        processor.disconnect(audioCtx.destination);
        source.disconnect(processor);
    };
}

async function setupSpectrogramFromAudioFile(
    audioCtx: AudioContext,
    source: ArrayBuffer | AudioBuffer,
    bufferCallback: (bufferData: SpectrogramBufferData) => Promise<Float32Array>,
    audioEndCallback: () => void
) {
    const audioBuffer = source instanceof AudioBuffer
        ? source
        : await new Promise<AudioBuffer>((resolve, reject) =>
            audioCtx.decodeAudioData(
                source,
                (buffer) => resolve(buffer),
                (err) => reject(err)
            )
        );

    // Use first channel only (mono for voice)
    let channelData = new Float32Array(audioBuffer.getChannelData(0));

    const bufferSource = audioCtx.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(audioCtx.destination);
    let isStopping = false;
    const playStartTime = performance.now();
    let nextSample = 0;

    const audioEventCallback = async () => {
        const duration = (performance.now() - playStartTime) / 1000;

        // Calculate spectrogram up to current point
        const totalSamples =
            Math.ceil((duration * audioBuffer.sampleRate - nextSample) / SPECTROGRAM_WINDOW_SIZE) *
            SPECTROGRAM_WINDOW_SIZE;

        if (totalSamples > 0) {
            const currentStart = nextSample;
            nextSample =
                nextSample + totalSamples - SPECTROGRAM_WINDOW_SIZE + SPECTROGRAM_WINDOW_OVERLAP;
            channelData = await bufferCallback({
                buffer: channelData,
                start: currentStart,
                length: totalSamples,
                sampleRate: audioBuffer.sampleRate,
                isStart: currentStart === 0,
            });
        }

        if (!isStopping && duration / audioBuffer.duration < 1.0) {
            setTimeout(
                audioEventCallback,
                ((SPECTROGRAM_WINDOW_OVERLAP / audioBuffer.sampleRate) * 1000) / 2
            );
        } else {
            bufferSource.disconnect(audioCtx.destination);
            audioEndCallback();
        }
    };
    audioEventCallback();

    // Play audio
    audioCtx.resume();
    bufferSource.start(0);

    return () => {
        isStopping = true;
        bufferSource.disconnect(audioCtx.destination);
    };
}

// Creates a frequency grid overlay (horizontal lines + Hz labels) on a spectrogram container.
// Returns an update function to call when the frequency range changes.
function createFrequencyOverlay(canvasSelector: string): (minHz: number, maxHz: number) => void {
    const canvas = document.querySelector(canvasSelector) as HTMLCanvasElement | null;
    if (canvas === null || canvas.parentElement === null) {
        return () => {};
    }

    const container = canvas.parentElement;
    const overlay = document.createElement('div');
    overlay.style.cssText =
        'position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;overflow:hidden';
    container.appendChild(overlay);

    return (minHz: number, maxHz: number) => {
        // Clear previous grid
        while (overlay.firstChild) {
            overlay.removeChild(overlay.firstChild);
        }

        const range = maxHz - minHz;
        if (range <= 0) return;

        // Pick a "nice" step so we get roughly 4-8 grid lines
        const steps = [10, 25, 50, 100, 200, 500, 1000];
        const step = steps.find((s) => range / s <= 10) || 1000;

        const startHz = Math.ceil(minHz / step) * step;
        for (let hz = startHz; hz < maxHz; hz += step) {
            const fraction = (hz - minHz) / range;
            const bottomPct = (fraction * 100).toFixed(2);

            // Grid line
            const line = document.createElement('div');
            line.style.cssText =
                `position:absolute;left:0;right:0;bottom:${bottomPct}%;` +
                'height:1px;background:rgba(255,255,255,0.07)';
            overlay.appendChild(line);

            // Hz label
            const label = document.createElement('div');
            label.style.cssText =
                `position:absolute;left:4px;bottom:${bottomPct}%;` +
                'transform:translateY(50%);font-size:10px;font-family:Roboto,sans-serif;' +
                'color:rgba(255,255,255,0.3);line-height:1';
            label.textContent = `${hz} Hz`;
            overlay.appendChild(label);
        }
    };
}

const TONE_GAP_SECONDS = 0.5;

async function loadPinyinTones(audioCtx: AudioContext, syllable: string, gender: VoiceGender): Promise<AudioBuffer> {
    const toneNumbers = [1, 2, 3, 4];
    const fetches = toneNumbers.map((t) =>
        fetch(`pinyin/${gender}/${syllable}${t}.wav`)
            .then((res) => {
                if (!res.ok) return null;
                return res.arrayBuffer();
            })
            .then((buf) =>
                buf
                    ? new Promise<AudioBuffer>((resolve, reject) =>
                          audioCtx.decodeAudioData(buf, resolve, reject)
                      )
                    : null
            )
            .catch(() => null)
    );

    const buffers = (await Promise.all(fetches)).filter(
        (b): b is AudioBuffer => b !== null
    );

    if (buffers.length === 0) {
        throw new Error(`No tone files found for syllable: ${syllable}`);
    }

    const sampleRate = buffers[0].sampleRate;
    const gapSamples = Math.round(TONE_GAP_SECONDS * sampleRate);
    const totalLength =
        buffers.reduce((sum, b) => sum + b.length, 0) +
        gapSamples * (buffers.length - 1);

    const combined = audioCtx.createBuffer(1, totalLength, sampleRate);
    const output = combined.getChannelData(0);
    let offset = 0;

    for (let i = 0; i < buffers.length; i++) {
        const data = buffers[i].getChannelData(0);
        output.set(data, offset);
        offset += data.length;
        if (i < buffers.length - 1) {
            offset += gapSamples;
        }
    }

    return combined;
}

let globalAudioCtx: AudioContext | null = null;

(async () => {
    const controlsContainer = document.querySelector('.controls');

    // Set up two independent spectrogram pipelines
    const reference = setupSingleSpectrogram('#referenceSpectrogram');
    const practice = setupSingleSpectrogram('#practiceSpectrogram');

    if (controlsContainer !== null && reference !== null && practice !== null) {
        let referenceStopCallback: (() => void) | null = null;
        let practiceStopCallback: (() => void) | null = null;
        let lastReferenceBuffer: ArrayBuffer | AudioBuffer | null = null;

        // Frequency grid overlays
        const updateReferenceOverlay = createFrequencyOverlay('#referenceSpectrogram');
        const updatePracticeOverlay = createFrequencyOverlay('#practiceSpectrogram');
        let currentMinHz = 50;
        let currentMaxHz = 800;
        updateReferenceOverlay(currentMinHz, currentMaxHz);
        updatePracticeOverlay(currentMinHz, currentMaxHz);

        const stopReference = () => {
            if (referenceStopCallback !== null) {
                referenceStopCallback();
            }
            referenceStopCallback = null;
        };

        const stopPractice = () => {
            if (practiceStopCallback !== null) {
                practiceStopCallback();
            }
            practiceStopCallback = null;
        };

        const startMicrophone = () => {
            practice.setAutoScroll(true);
            if (globalAudioCtx === null) {
                globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            globalAudioCtx.resume().then(() =>
            setupSpectrogramFromMicrophone(
                globalAudioCtx!,
                practice.bufferCallback
            )).then(
                (callback) => {
                    practiceStopCallback = callback;
                    setPracticePlayState('playing');
                },
                () => setPracticePlayState('stopped')
            );
        };

        const playReferenceFile = (file: ArrayBuffer | AudioBuffer) => {
            reference.setAutoScroll(true);
            lastReferenceBuffer = file;
            if (globalAudioCtx === null) {
                globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            globalAudioCtx.resume().then(() =>
            setupSpectrogramFromAudioFile(
                globalAudioCtx!,
                file,
                reference.bufferCallback,
                () => setReferencePlayState('stopped')
            )).then(
                (callback) => {
                    referenceStopCallback = callback;
                    setReferencePlayState('playing');
                },
                () => setReferencePlayState('stopped')
            );
        };

        let loadPresetSeq = 0;
        const loadPinyinPreset = (value: string, gender: VoiceGender) => {
            const seq = ++loadPresetSeq;
            stopReference();
            reference.clearCallback();
            if (globalAudioCtx === null) {
                globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            globalAudioCtx.resume().then(() => {
                if (seq !== loadPresetSeq) return null;
                setReferencePlayState('loading-file');
                if (value.startsWith('combo:')) {
                    const id = value.slice(6);
                    return fetch(`pinyin/combos/${id}.mp3`).then((r) => {
                        if (!r.ok) throw new Error(`Failed to fetch combo: ${id}`);
                        return r.arrayBuffer();
                    });
                }
                return loadPinyinTones(globalAudioCtx!, value, gender);
            }).then((result) => {
                if (!result || seq !== loadPresetSeq) return;
                setHasReference(true);
                playReferenceFile(result);
            }).catch(() => {
                if (seq === loadPresetSeq) {
                    setReferencePlayState('stopped');
                }
            });
        };

        const { setReferencePlayState, setPracticePlayState, setHasReference } = initialiseControlsUi(
            controlsContainer,
            {
                stopReferenceCallback: stopReference,
                stopPracticeCallback: stopPractice,
                clearReferenceCallback: () => {
                    reference.clearCallback();
                },
                clearPracticeCallback: () => {
                    practice.clearCallback();
                },
                renderParametersUpdateCallback: (parameters: Partial<RenderParameters>) => {
                    reference.updateRenderParameters(parameters);
                    practice.updateRenderParameters(parameters);
                    if (parameters.minFrequencyHz !== undefined) {
                        currentMinHz = parameters.minFrequencyHz;
                    }
                    if (parameters.maxFrequencyHz !== undefined) {
                        currentMaxHz = parameters.maxFrequencyHz;
                    }
                    if (parameters.minFrequencyHz !== undefined || parameters.maxFrequencyHz !== undefined) {
                        updateReferenceOverlay(currentMinHz, currentMaxHz);
                        updatePracticeOverlay(currentMinHz, currentMaxHz);
                    }
                },
                renderFromMicrophoneCallback: startMicrophone,
                renderFromFileCallback: playReferenceFile,
                loadPinyinPresetCallback: (syllable: string, gender: VoiceGender) => loadPinyinPreset(syllable, gender),
                replayReferenceCallback: () => {
                    if (lastReferenceBuffer !== null) {
                        reference.clearCallback();
                        playReferenceFile(lastReferenceBuffer);
                    }
                },
                reRecordCallback: () => {
                    stopPractice();
                    setPracticePlayState('stopped');
                    practice.clearCallback();
                    setPracticePlayState('loading-mic');
                    startMicrophone();
                },
                saveImageCallback: () => {
                    const refCanvas = document.querySelector('#referenceSpectrogram') as HTMLCanvasElement | null;
                    const pracCanvas = document.querySelector('#practiceSpectrogram') as HTMLCanvasElement | null;
                    if (!refCanvas || !pracCanvas) return;

                    const dpr = window.devicePixelRatio || 1;
                    const w = refCanvas.width;
                    const refH = refCanvas.height;
                    const pracH = pracCanvas.height;
                    const totalH = refH + pracH;

                    const composite = document.createElement('canvas');
                    composite.width = w * dpr;
                    composite.height = totalH * dpr;
                    const ctx = composite.getContext('2d')!;
                    ctx.scale(dpr, dpr);

                    // Black background
                    ctx.fillStyle = '#000';
                    ctx.fillRect(0, 0, w, totalH);

                    // Draw both spectrograms
                    ctx.drawImage(refCanvas, 0, 0, w, refH);
                    ctx.drawImage(pracCanvas, 0, refH, w, pracH);

                    // Divider line
                    ctx.fillStyle = 'rgba(119, 119, 119, 0.3)';
                    ctx.fillRect(0, refH, w, 1);

                    // Labels
                    const drawLabel = (text: string, y: number) => {
                        ctx.font = '500 11px Roboto, sans-serif';
                        ctx.textBaseline = 'top';
                        const metrics = ctx.measureText(text);
                        const px = 6;
                        const py = 4;
                        ctx.fillStyle = 'rgba(53, 53, 53, 0.7)';
                        ctx.fillRect(0, y, metrics.width + px * 2, 11 + py * 2);
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                        ctx.fillText(text, px, y + py);
                    };
                    drawLabel('REFERENCE', 0);
                    drawLabel('YOUR VOICE', refH);

                    // Logo branding in bottom-right corner
                    const logo = new Image();
                    logo.onload = () => {
                        const logoSize = 72;
                        const margin = 16;
                        const brandY = totalH - logoSize - margin;

                        // Logo
                        ctx.drawImage(logo, w - logoSize - margin, brandY, logoSize, logoSize);

                        // "Recorded with" on first line, "shengpu" on second
                        const lineGap = 16;
                        const centerY = brandY + logoSize / 2 + 4;
                        ctx.textBaseline = 'middle';
                        ctx.textAlign = 'right';
                        const textX = w - logoSize - margin - 10;

                        ctx.font = '400 11px Roboto, sans-serif';
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                        ctx.fillText('Recorded with', textX, centerY - lineGap / 2);

                        ctx.font = '500 13px Roboto, sans-serif';
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                        ctx.fillText('shengpu', textX, centerY + lineGap / 2);

                        ctx.textAlign = 'left';

                        // Download
                        composite.toBlob((blob) => {
                            if (!blob) return;
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'shengpu-spectrogram.png';
                            a.click();
                            URL.revokeObjectURL(url);
                        }, 'image/png');
                    };
                    logo.onerror = () => {
                        // Download without logo if it fails to load
                        composite.toBlob((blob) => {
                            if (!blob) return;
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'shengpu-spectrogram.png';
                            a.click();
                            URL.revokeObjectURL(url);
                        }, 'image/png');
                    };
                    logo.src = 'shengpu-logo.png';
                },
            }
        );

        // Spacebar shortcut for practice toggle
        window.addEventListener('keydown', (e) => {
            // Ignore if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }
            if (e.code === 'Space') {
                e.preventDefault();
                if (practiceStopCallback !== null) {
                    stopPractice();
                    setPracticePlayState('stopped');
                } else {
                    setPracticePlayState('loading-mic');
                    startMicrophone();
                }
            }
        });

        // Load default pinyin preset
        loadPinyinPreset(DEFAULT_SYLLABLE, DEFAULT_GENDER);
    }
})();
