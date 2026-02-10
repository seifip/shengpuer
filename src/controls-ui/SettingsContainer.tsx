import React, {
    MouseEvent,
    useState,
    useEffect,
    useMemo,
    useRef,
    useCallback,
} from 'react';

import { HEATED_METAL_GRADIENT } from '../color-util';
import { PINYIN_SYLLABLES, TONE_GROUPS, DEFAULT_SYLLABLE, DEFAULT_GENDER, VoiceGender } from '../pinyin-data';
import { RenderParameters } from '../spectrogram-render';

import { Button } from '../components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectViewport, SelectItem, SelectGroup, SelectLabel } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { Dialog, DialogTrigger, DialogContent, DialogClose } from '../components/ui/dialog';
import { UploadIcon, CloseIcon, ExpandMoreIcon, SettingsIcon, CameraIcon, RecordDot } from './icons';
import generateLabelledSlider from './LabelledSlider';

function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
    useEffect(() => {
        const mql = window.matchMedia(query);
        const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, [query]);
    return matches;
}

const formatHz = (hz: number) => {
    if (hz < 999.5) return `${hz.toPrecision(3)} Hz`;
    return `${(hz / 1000).toPrecision(3)} kHz`;
};

const formatPercentage = (value: number) => {
    if (value * 100 >= 999.5) return `${(value * 100).toPrecision(4)}%`;
    return `${(value * 100).toPrecision(3)}%`;
};

const MALE_VOICE_PRESET = { minFrequency: 50, maxFrequency: 500 };
const FEMALE_VOICE_PRESET = { minFrequency: 80, maxFrequency: 1000 };

export type PlayState = 'stopped' | 'loading-file' | 'loading-mic' | 'playing';

export interface SettingsContainerProps {
    onStopReference: () => void;
    onStopPractice: () => void;
    onClearReference: () => void;
    onClearPractice: () => void;
    onRenderParametersUpdate: (settings: Partial<RenderParameters>) => void;
    onRenderFromMicrophone: () => void;
    onRenderFromFile: (file: ArrayBuffer) => void;
    onLoadPinyinPreset: (syllable: string, gender: VoiceGender) => void;
    onReplayReference: () => void;
    onReRecord: () => void;
    onSaveImage: () => void;
}

export type SettingsContainer = (props: SettingsContainerProps) => JSX.Element;

function generateSettingsContainer(): [
    SettingsContainer,
    (playState: PlayState) => void,
    (playState: PlayState) => void,
    (has: boolean) => void
] {
    let setReferencePlayStateExport: ((playState: PlayState) => void) | null = null;
    let setPracticePlayStateExport: ((playState: PlayState) => void) | null = null;
    let setHasReferenceExport: ((has: boolean) => void) | null = null;

    const SettingsContainer = ({
        onStopReference,
        onStopPractice,
        onClearReference,
        onClearPractice,
        onRenderParametersUpdate,
        onRenderFromMicrophone,
        onRenderFromFile,
        onLoadPinyinPreset,
        onReplayReference,
        onReRecord,
        onSaveImage,
    }: SettingsContainerProps) => {
        const { current: defaultParameters } = useRef({
            sensitivity: 0.45,
            contrast: 0.35,
            zoom: 6,
            minFrequency: 50,
            maxFrequency: 800,
        });

        const isMobile = useMediaQuery('(max-width: 800px)');
        const [settingsOpen, setSettingsOpen] = useState(false);
        const [presetKey, setPresetKey] = useState(0);
        const [showAdvanced, setShowAdvanced] = useState(false);

        const onInnerPaperClick = useCallback((e: MouseEvent) => e.stopPropagation(), []);

        const fileRef = useRef<HTMLInputElement | null>(null);

        const [referencePlayState, setReferencePlayState] = useState<PlayState>('stopped');
        const [practicePlayState, setPracticePlayState] = useState<PlayState>('stopped');
        const [hasReference, setHasReference] = useState(false);
        const [selectedSyllable, setSelectedSyllable] = useState(DEFAULT_SYLLABLE);
        const [voicePreset, setVoicePreset] = useState<VoiceGender>(DEFAULT_GENDER);
        const [syllableFilter, setSyllableFilter] = useState('');
        const searchRef = useRef<HTMLInputElement | null>(null);
        const filteredSyllables = useMemo(
            () => syllableFilter
                ? PINYIN_SYLLABLES.filter((s) => s.startsWith(syllableFilter.toLowerCase()))
                : PINYIN_SYLLABLES,
            [syllableFilter]
        );
        const [SensitivitySlider, setSensitivity] = useMemo(generateLabelledSlider, []);
        const [ContrastSlider, setContrast] = useMemo(generateLabelledSlider, []);
        const [ZoomSlider, setZoom] = useMemo(generateLabelledSlider, []);
        const [MinFrequencySlider, setMinFrequency] = useMemo(generateLabelledSlider, []);
        const [MaxFrequencySlider, setMaxFrequency] = useMemo(generateLabelledSlider, []);

        const onSyllableChange = useCallback(
            (value: string) => {
                setSelectedSyllable(value);
                onLoadPinyinPreset(value, voicePreset);
            },
            [onLoadPinyinPreset, voicePreset]
        );

        const onPlayMicrophoneClick = useCallback(() => {
            setPracticePlayState('loading-mic');
            onRenderFromMicrophone();
        }, [onRenderFromMicrophone]);
        const onPlayFileClick = useCallback(() => {
            if (fileRef.current === null) return;
            fileRef.current.click();
        }, []);
        const onFileChange = useCallback(() => {
            if (
                fileRef.current === null ||
                fileRef.current.files === null ||
                fileRef.current.files.length !== 1
            ) return;

            const file = fileRef.current.files[0];
            const reader = new FileReader();
            setReferencePlayState('loading-file');
            reader.addEventListener('load', () => {
                if (fileRef.current !== null) fileRef.current.value = '';
                if (reader.result instanceof ArrayBuffer) {
                    setHasReference(true);
                    onRenderFromFile(reader.result);
                } else {
                    setReferencePlayState('stopped');
                }
            });
            reader.readAsArrayBuffer(file);
        }, [onRenderFromFile]);
        const onStopReferenceClick = useCallback(() => {
            onStopReference();
            setReferencePlayState('stopped');
        }, [onStopReference]);
        const onReplayClick = useCallback(() => {
            setReferencePlayState('loading-file');
            onReplayReference();
        }, [onReplayReference]);
        const onStopPracticeClick = useCallback(() => {
            onStopPractice();
            setPracticePlayState('stopped');
        }, [onStopPractice]);
        const onReRecordClick = useCallback(() => {
            setPracticePlayState('loading-mic');
            onReRecord();
        }, [onReRecord]);
        const onSensitivityChange = useCallback(
            (value: number) => {
                defaultParameters.sensitivity = value;
                const scaledValue = 10 ** (value * 3) - 1;
                onRenderParametersUpdate({ sensitivity: scaledValue });
                setSensitivity(formatPercentage(value));
            },
            [onRenderParametersUpdate, setSensitivity]
        );
        const onContrastChange = useCallback(
            (value: number) => {
                defaultParameters.contrast = value;
                const scaledValue = 10 ** (value * 6) - 1;
                onRenderParametersUpdate({ contrast: scaledValue });
                setContrast(formatPercentage(value));
            },
            [onRenderParametersUpdate, setContrast]
        );
        const onZoomChange = useCallback(
            (value: number) => {
                defaultParameters.zoom = value;
                onRenderParametersUpdate({ zoom: value });
                setZoom(formatPercentage(value));
            },
            [onRenderParametersUpdate, setZoom]
        );
        const onMinFreqChange = useCallback(
            (value: number) => {
                defaultParameters.minFrequency = value;
                onRenderParametersUpdate({ minFrequencyHz: value });
                setMinFrequency(formatHz(value));
            },
            [onRenderParametersUpdate, setMinFrequency]
        );
        const onMaxFreqChange = useCallback(
            (value: number) => {
                defaultParameters.maxFrequency = value;
                onRenderParametersUpdate({ maxFrequencyHz: value });
                setMaxFrequency(formatHz(value));
            },
            [onRenderParametersUpdate, setMaxFrequency]
        );

        const applyPreset = useCallback(
            (preset: { minFrequency: number; maxFrequency: number }) => {
                defaultParameters.minFrequency = preset.minFrequency;
                defaultParameters.maxFrequency = preset.maxFrequency;
                onRenderParametersUpdate({
                    minFrequencyHz: preset.minFrequency,
                    maxFrequencyHz: preset.maxFrequency,
                });
                setMinFrequency(formatHz(preset.minFrequency));
                setMaxFrequency(formatHz(preset.maxFrequency));
                setPresetKey((k) => k + 1);
            },
            [onRenderParametersUpdate, setMinFrequency, setMaxFrequency]
        );

        useEffect(() => {
            setReferencePlayStateExport = setReferencePlayState;
            setPracticePlayStateExport = setPracticePlayState;
            setHasReferenceExport = setHasReference;
        }, []);

        // Update all parameters on mount
        useEffect(() => {
            onSensitivityChange(defaultParameters.sensitivity);
            onContrastChange(defaultParameters.contrast);
            onZoomChange(defaultParameters.zoom);
            onMinFreqChange(defaultParameters.minFrequency);
            onMaxFreqChange(defaultParameters.maxFrequency);
            onRenderParametersUpdate({ scale: 'linear' });
            onRenderParametersUpdate({ gradient: HEATED_METAL_GRADIENT });
        }, []);

        const content = (
            <>
                <div className="flex justify-center mb-6">
                    <img src="shengpuer-logo.png" alt="Shengpu" className="w-40 h-40 rounded-[32px]" />
                </div>

                <p className="m-0 mb-3 opacity-40 text-[0.6rem] uppercase tracking-[0.08em]">
                    Reference
                </p>
                <Select
                    value={selectedSyllable}
                    onValueChange={onSyllableChange}
                    onOpenChange={(open) => {
                        if (!open) setSyllableFilter('');
                        else setTimeout(() => searchRef.current?.focus(), 0);
                    }}
                >
                    <SelectTrigger className="mb-2">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <div className="px-2 pt-1 sticky top-0 bg-[#333] z-[1]">
                            <input
                                ref={searchRef}
                                className="w-full box-border px-2 py-1.5 border border-white/[0.23] rounded bg-black/30 text-foreground text-[0.8125rem] outline-none focus:border-primary placeholder:text-white/40"
                                type="text"
                                placeholder="Search..."
                                value={syllableFilter}
                                onChange={(e) => setSyllableFilter(e.target.value)}
                                onKeyDown={(e) => e.stopPropagation()}
                            />
                        </div>
                        <SelectViewport>
                            {!syllableFilter && TONE_GROUPS.map((group) => (
                                <SelectGroup key={group.label}>
                                    <SelectLabel>{group.label}</SelectLabel>
                                    {group.combos.map((c) => (
                                        <SelectItem key={c.id} value={`combo:${c.id}`}>
                                            {c.pinyin} {c.meaning} ({c.tones})
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            ))}
                            <SelectGroup>
                                <SelectLabel>Syllables</SelectLabel>
                                {filteredSyllables.map((s) => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectViewport>
                    </SelectContent>
                </Select>
                <input
                    type="file"
                    style={{ display: 'none' }}
                    accept="audio/x-m4a,audio/*"
                    onChange={onFileChange}
                    ref={fileRef}
                />
                <div className="relative mb-2">
                    {referencePlayState === 'playing' ? (
                        <Button size="sm" fullWidth onClick={onStopReferenceClick}>
                            Stop
                        </Button>
                    ) : (
                        <Button variant="outline" size="sm" fullWidth onClick={onPlayFileClick} disabled={referencePlayState !== 'stopped'}>
                            <UploadIcon /> Upload audio
                        </Button>
                    )}
                    {referencePlayState === 'loading-file' && (
                        <span className="absolute top-1/2 left-1/2 -mt-3 -ml-3 inline-block w-6 h-6 border-[3px] border-white/20 border-t-secondary rounded-full animate-spin" />
                    )}
                </div>
                <div className="flex justify-between mb-6">
                    <Button
                        variant="ghost"
                        className="text-[0.65rem] px-2 py-0.5 min-w-0 normal-case opacity-60"
                        onClick={onReplayClick}
                        disabled={!hasReference || referencePlayState !== 'stopped'}
                    >
                        Replay
                    </Button>
                    <Button
                        variant="ghost"
                        className="text-[0.65rem] px-2 py-0.5 min-w-0 normal-case opacity-60"
                        onClick={onClearReference}
                        disabled={referencePlayState === 'playing'}
                    >
                        Clear
                    </Button>
                </div>

                <p className="m-0 mb-3 opacity-40 text-[0.6rem] uppercase tracking-[0.08em]">
                    Your voice
                </p>
                <div className="relative mb-2">
                    {practicePlayState === 'playing' ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            fullWidth
                            onClick={onStopPracticeClick}
                            className="spectro-recording-btn bg-[rgba(229,57,53,0.1)] border border-[rgba(229,57,53,0.3)] hover:bg-[rgba(229,57,53,0.2)]"
                        >
                            <RecordDot pulsing /> Recording
                        </Button>
                    ) : (
                        <Button size="sm" fullWidth onClick={onPlayMicrophoneClick} disabled={practicePlayState !== 'stopped'}>
                            <RecordDot pulsing={practicePlayState === 'loading-mic'} /> Record
                        </Button>
                    )}
                </div>
                <div className="flex justify-between mb-6">
                    <Button
                        variant="ghost"
                        className="text-[0.65rem] px-2 py-0.5 min-w-0 normal-case opacity-60"
                        onClick={onReRecordClick}
                        disabled={practicePlayState === 'loading-mic'}
                    >
                        Redo
                    </Button>
                    <Button
                        variant="ghost"
                        className="text-[0.65rem] px-2 py-0.5 min-w-0 normal-case opacity-60"
                        onClick={onClearPractice}
                        disabled={practicePlayState === 'playing'}
                    >
                        Clear
                    </Button>
                </div>

                <Button variant="outline" size="sm" fullWidth onClick={onSaveImage}>
                    <CameraIcon /> Save snapshot
                </Button>

                <Separator className="mt-4 mb-6" />

                <div className="flex gap-2 mb-4">
                    <Button
                        variant={voicePreset === 'male' ? 'default' : 'outline'}
                        size="sm"
                        fullWidth
                        onClick={() => {
                            setVoicePreset('male');
                            applyPreset(MALE_VOICE_PRESET);
                            onLoadPinyinPreset(selectedSyllable, 'male');
                        }}
                    >
                        Male
                    </Button>
                    <Button
                        variant={voicePreset === 'female' ? 'default' : 'outline'}
                        size="sm"
                        fullWidth
                        onClick={() => {
                            setVoicePreset('female');
                            applyPreset(FEMALE_VOICE_PRESET);
                            onLoadPinyinPreset(selectedSyllable, 'female');
                        }}
                    >
                        Female
                    </Button>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    fullWidth
                    className="opacity-50 text-[0.65rem] tracking-[0.05em]"
                    onClick={() => setShowAdvanced((v) => !v)}
                >
                    Advanced
                    <ExpandMoreIcon
                        fontSize="small"
                        style={{
                            transform: showAdvanced ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.2s',
                        }}
                    />
                </Button>
                {showAdvanced && (
                    <>
                        <SensitivitySlider
                            key={`sensitivity-${presetKey}`}
                            nameLabelId="sensitivity-slider-label"
                            nameLabel="Brightness"
                            min={0}
                            max={1}
                            step={0.001}
                            defaultValue={defaultParameters.sensitivity}
                            onChange={onSensitivityChange}
                        />
                        <ContrastSlider
                            key={`contrast-${presetKey}`}
                            nameLabelId="contrast-slider-label"
                            nameLabel="Contrast"
                            min={0}
                            max={1}
                            step={0.001}
                            defaultValue={defaultParameters.contrast}
                            onChange={onContrastChange}
                        />
                        <ZoomSlider
                            key={`zoom-${presetKey}`}
                            nameLabelId="zoom-slider-label"
                            nameLabel="Time stretch"
                            min={1}
                            max={10}
                            step={0.01}
                            defaultValue={defaultParameters.zoom}
                            onChange={onZoomChange}
                        />
                        <MinFrequencySlider
                            key={`min-freq-${presetKey}`}
                            nameLabelId="min-freq-slider-label"
                            nameLabel="Lower pitch"
                            min={0}
                            max={2000}
                            step={1}
                            defaultValue={defaultParameters.minFrequency}
                            onChange={onMinFreqChange}
                        />
                        <MaxFrequencySlider
                            key={`max-freq-${presetKey}`}
                            nameLabelId="max-freq-slider-label"
                            nameLabel="Upper pitch"
                            min={0}
                            max={2000}
                            step={1}
                            defaultValue={defaultParameters.maxFrequency}
                            onChange={onMaxFreqChange}
                        />
                    </>
                )}
            </>
        );

        return (
            <div>
                {isMobile ? (
                    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                        <DialogTrigger asChild>
                            <Button
                                size="lg"
                                className="rounded-t-2xl rounded-b-none px-6 py-3"
                            >
                                <SettingsIcon /> Settings
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <div
                                className="rounded-t-2xl max-w-[300px] p-4 mx-auto mt-4 bg-[rgba(34,34,34,0.5)] backdrop-blur-2xl"
                                onClick={onInnerPaperClick}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <DialogClose asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="-ml-3 -my-3 w-12 h-12"
                                            aria-label="close"
                                        >
                                            <CloseIcon />
                                        </Button>
                                    </DialogClose>
                                    <span className="text-base font-normal leading-[1.75] tracking-[0.00938em]">
                                        Settings
                                    </span>
                                </div>
                                {content}
                            </div>
                        </DialogContent>
                    </Dialog>
                ) : (
                    content
                )}
            </div>
        );
    };

    return [
        SettingsContainer,
        (playState) => {
            if (setReferencePlayStateExport !== null) {
                setReferencePlayStateExport(playState);
            } else {
                throw new Error('Attempt to set reference play state before component mount');
            }
        },
        (playState) => {
            if (setPracticePlayStateExport !== null) {
                setPracticePlayStateExport(playState);
            } else {
                throw new Error('Attempt to set practice play state before component mount');
            }
        },
        (has) => {
            if (setHasReferenceExport !== null) {
                setHasReferenceExport(has);
            }
        },
    ];
}

export default generateSettingsContainer;
