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
import { Popover, PopoverTrigger, PopoverContent } from '../components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '../components/ui/command';
import { Separator } from '../components/ui/separator';
import { Dialog, DialogTrigger, DialogContent, DialogClose } from '../components/ui/dialog';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip';
import { Kbd } from '../components/ui/kbd';
import { UploadIcon, CloseIcon, ExpandMoreIcon, SettingsIcon, RecordDot } from './icons';
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

const STORAGE_KEY = 'shengpu-settings';

interface SavedSettings {
    selectedSyllable: string;
    voicePreset: VoiceGender;
    sensitivity: number;
    contrast: number;
    zoom: number;
    minFrequency: number;
    maxFrequency: number;
    showAdvanced: boolean;
}

const SETTING_DEFAULTS: SavedSettings = {
    selectedSyllable: DEFAULT_SYLLABLE,
    voicePreset: DEFAULT_GENDER,
    sensitivity: 0.45,
    contrast: 0.35,
    zoom: 10,
    minFrequency: 50,
    maxFrequency: 800,
    showAdvanced: false,
};

function loadSettings(): SavedSettings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return { ...SETTING_DEFAULTS, ...JSON.parse(raw) };
    } catch {}
    return { ...SETTING_DEFAULTS };
}

function saveSettings(partial: Partial<SavedSettings>) {
    try {
        const current = loadSettings();
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...partial }));
    } catch {}
}

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
    let pendingReferencePlayState: PlayState | null = null;
    let pendingPracticePlayState: PlayState | null = null;
    let pendingHasReference: boolean | null = null;

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
    }: SettingsContainerProps) => {
        const saved = useMemo(loadSettings, []);
        const { current: defaultParameters } = useRef({
            sensitivity: saved.sensitivity,
            contrast: saved.contrast,
            zoom: saved.zoom,
            minFrequency: saved.minFrequency,
            maxFrequency: saved.maxFrequency,
        });

        const isMobile = useMediaQuery('(max-width: 800px)');
        const [settingsOpen, setSettingsOpen] = useState(false);
        const [presetKey, setPresetKey] = useState(0);
        const [showAdvanced, setShowAdvanced] = useState(saved.showAdvanced);

        const onInnerPaperClick = useCallback((e: MouseEvent) => e.stopPropagation(), []);

        const fileRef = useRef<HTMLInputElement | null>(null);

        const [referencePlayState, setReferencePlayState] = useState<PlayState>('stopped');
        const [practicePlayState, setPracticePlayState] = useState<PlayState>('stopped');
        const [hasReference, setHasReference] = useState(false);
        const [selectedSyllable, setSelectedSyllable] = useState(saved.selectedSyllable);
        const [voicePreset, setVoicePreset] = useState<VoiceGender>(saved.voicePreset);
        const [comboboxOpen, setComboboxOpen] = useState(false);

        const getDisplayLabel = useCallback((value: string) => {
            if (value.startsWith('combo:')) {
                const id = value.slice(6);
                for (const group of TONE_GROUPS) {
                    const combo = group.combos.find((c) => c.id === id);
                    if (combo) return `${combo.pinyin} ${combo.meaning}`;
                }
            }
            return value;
        }, []);
        const [SensitivitySlider, setSensitivity] = useMemo(generateLabelledSlider, []);
        const [ContrastSlider, setContrast] = useMemo(generateLabelledSlider, []);
        const [ZoomSlider, setZoom] = useMemo(generateLabelledSlider, []);
        const [MinFrequencySlider, setMinFrequency] = useMemo(generateLabelledSlider, []);
        const [MaxFrequencySlider, setMaxFrequency] = useMemo(generateLabelledSlider, []);

        const onSyllableChange = useCallback(
            (value: string) => {
                setSelectedSyllable(value);
                saveSettings({ selectedSyllable: value });
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
                saveSettings({ sensitivity: value });
                const scaledValue = 10 ** (value * 3) - 1;
                onRenderParametersUpdate({ sensitivity: scaledValue });
                setSensitivity(formatPercentage(value));
            },
            [onRenderParametersUpdate, setSensitivity]
        );
        const onContrastChange = useCallback(
            (value: number) => {
                defaultParameters.contrast = value;
                saveSettings({ contrast: value });
                const scaledValue = 10 ** (value * 6) - 1;
                onRenderParametersUpdate({ contrast: scaledValue });
                setContrast(formatPercentage(value));
            },
            [onRenderParametersUpdate, setContrast]
        );
        const onZoomChange = useCallback(
            (value: number) => {
                defaultParameters.zoom = value;
                saveSettings({ zoom: value });
                onRenderParametersUpdate({ zoom: value });
                setZoom(formatPercentage(value));
            },
            [onRenderParametersUpdate, setZoom]
        );
        const onMinFreqChange = useCallback(
            (value: number) => {
                defaultParameters.minFrequency = value;
                saveSettings({ minFrequency: value });
                onRenderParametersUpdate({ minFrequencyHz: value });
                setMinFrequency(formatHz(value));
            },
            [onRenderParametersUpdate, setMinFrequency]
        );
        const onMaxFreqChange = useCallback(
            (value: number) => {
                defaultParameters.maxFrequency = value;
                saveSettings({ maxFrequency: value });
                onRenderParametersUpdate({ maxFrequencyHz: value });
                setMaxFrequency(formatHz(value));
            },
            [onRenderParametersUpdate, setMaxFrequency]
        );

        const applyPreset = useCallback(
            (preset: { minFrequency: number; maxFrequency: number }) => {
                defaultParameters.minFrequency = preset.minFrequency;
                defaultParameters.maxFrequency = preset.maxFrequency;
                saveSettings({ minFrequency: preset.minFrequency, maxFrequency: preset.maxFrequency });
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

            // External callbacks may fire before this component mounts (async audio loads, etc).
            // Buffer early state updates and apply them on mount to avoid hard crashes.
            if (pendingReferencePlayState !== null) {
                setReferencePlayState(pendingReferencePlayState);
                pendingReferencePlayState = null;
            }
            if (pendingPracticePlayState !== null) {
                setPracticePlayState(pendingPracticePlayState);
                pendingPracticePlayState = null;
            }
            if (pendingHasReference !== null) {
                setHasReference(pendingHasReference);
                pendingHasReference = null;
            }
        }, []);

        // Update all parameters on mount (uses saved values from localStorage)
        useEffect(() => {
            onSensitivityChange(defaultParameters.sensitivity);
            onContrastChange(defaultParameters.contrast);
            onZoomChange(defaultParameters.zoom);
            onMinFreqChange(defaultParameters.minFrequency);
            onMaxFreqChange(defaultParameters.maxFrequency);
            onRenderParametersUpdate({ scale: 'linear' });
            onRenderParametersUpdate({ gradient: HEATED_METAL_GRADIENT });
            onLoadPinyinPreset(saved.selectedSyllable, saved.voicePreset);
        }, []);

        const content = (
            <>
                <div className="flex justify-center mb-6">
                    <img src="shengpu-logo.png" alt="Shengpu" className="w-40 h-40 rounded-[32px]" />
                </div>

                <p className="m-0 mb-3 opacity-40 text-[0.6rem] uppercase tracking-[0.08em]">
                    Reference
                </p>
                <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            fullWidth
                            className="mb-2 justify-between font-normal normal-case"
                            aria-expanded={comboboxOpen}
                        >
                            {getDisplayLabel(selectedSyllable)}
                            <i className="fa-solid fa-chevron-down text-[0.7em] text-muted-foreground ml-2" aria-hidden="true" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                        <Command>
                            <CommandInput placeholder="Search syllables..." />
                            <CommandList>
                                <CommandEmpty>No results found.</CommandEmpty>
                                {TONE_GROUPS.map((group) => (
                                    <CommandGroup key={group.label} heading={group.label}>
                                        {group.combos.map((c) => (
                                            <CommandItem
                                                key={c.id}
                                                value={`${c.pinyin} ${c.meaning} ${c.tones}`}
                                                onSelect={() => {
                                                    onSyllableChange(`combo:${c.id}`);
                                                    setComboboxOpen(false);
                                                }}
                                            >
                                                {selectedSyllable === `combo:${c.id}` && (
                                                    <i className="fa-solid fa-check text-[0.7em] mr-2" aria-hidden="true" />
                                                )}
                                                {c.pinyin} {c.meaning} ({c.tones})
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                ))}
                                <CommandGroup heading="Syllables">
                                    {PINYIN_SYLLABLES.map((s) => (
                                        <CommandItem
                                            key={s}
                                            value={s}
                                            onSelect={() => {
                                                onSyllableChange(s);
                                                setComboboxOpen(false);
                                            }}
                                        >
                                            {selectedSyllable === s && (
                                                <i className="fa-solid fa-check text-[0.7em] mr-2" aria-hidden="true" />
                                            )}
                                            {s}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
                <input
                    type="file"
                    style={{ display: 'none' }}
                    accept="audio/x-m4a,audio/*"
                    onChange={onFileChange}
                    ref={fileRef}
                />
                <div className="relative mb-2">
                    {referencePlayState === 'playing' ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button size="sm" fullWidth onClick={onStopReferenceClick}>
                                    Stop
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">Stop reference playback</TooltipContent>
                        </Tooltip>
                    ) : (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" fullWidth onClick={onPlayFileClick} disabled={referencePlayState !== 'stopped'}>
                                    <UploadIcon /> Upload audio
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">Upload an audio file as reference</TooltipContent>
                        </Tooltip>
                    )}
                    {referencePlayState === 'loading-file' && (
                        <span className="absolute top-1/2 left-1/2 -mt-3 -ml-3 inline-block w-6 h-6 border-[3px] border-white/20 border-t-secondary rounded-full animate-spin" />
                    )}
                </div>
                <div className="flex justify-between mb-6">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                className="text-[0.65rem] px-2 py-0.5 min-w-0 normal-case opacity-60"
                                onClick={onReplayClick}
                                disabled={!hasReference || referencePlayState !== 'stopped'}
                            >
                                Replay
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Replay reference audio</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                className="text-[0.65rem] px-2 py-0.5 min-w-0 normal-case opacity-60"
                                onClick={onClearReference}
                                disabled={referencePlayState === 'playing'}
                            >
                                Clear
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Clear reference spectrogram</TooltipContent>
                    </Tooltip>
                </div>

                <Separator className="mb-6" />

                <div className="flex gap-2 mb-4">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={voicePreset === 'male' ? 'default' : 'outline'}
                                size="sm"
                                fullWidth
                                onClick={() => {
                                    setVoicePreset('male');
                                    saveSettings({ voicePreset: 'male' });
                                    applyPreset(MALE_VOICE_PRESET);
                                    onLoadPinyinPreset(selectedSyllable, 'male');
                                }}
                            >
                                Male
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Male voice pitch range (50–500 Hz)</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={voicePreset === 'female' ? 'default' : 'outline'}
                                size="sm"
                                fullWidth
                                onClick={() => {
                                    setVoicePreset('female');
                                    saveSettings({ voicePreset: 'female' });
                                    applyPreset(FEMALE_VOICE_PRESET);
                                    onLoadPinyinPreset(selectedSyllable, 'female');
                                }}
                            >
                                Female
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Female voice pitch range (80–1000 Hz)</TooltipContent>
                    </Tooltip>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    fullWidth
                    className="opacity-50 text-[0.65rem] tracking-[0.05em]"
                    onClick={() => setShowAdvanced((v) => {
                        saveSettings({ showAdvanced: !v });
                        return !v;
                    })}
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

                <div className="flex-1" />

                <div className="relative mt-6 mb-2">
                    {practicePlayState === 'playing' ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    fullWidth
                                    onClick={onStopPracticeClick}
                                    className="spectro-recording-btn h-16 bg-[rgba(229,57,53,0.1)] border border-[rgba(229,57,53,0.3)] hover:bg-[rgba(229,57,53,0.2)]"
                                >
                                    <RecordDot pulsing /> Recording
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                <span className="inline-flex items-center">Stop recording <Kbd keys={['Space']} /></span>
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button fullWidth onClick={onPlayMicrophoneClick} disabled={practicePlayState !== 'stopped'} className="h-16">
                                    <RecordDot pulsing={practicePlayState === 'loading-mic'} /> Record
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                <span className="inline-flex items-center">Record your voice <Kbd keys={['Space']} /></span>
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
                <div className="flex justify-between">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                className="text-[0.65rem] px-2 py-0.5 min-w-0 normal-case opacity-60"
                                onClick={onReRecordClick}
                                disabled={practicePlayState === 'loading-mic'}
                            >
                                Redo
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Clear and re-record</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                className="text-[0.65rem] px-2 py-0.5 min-w-0 normal-case opacity-60"
                                onClick={onClearPractice}
                                disabled={practicePlayState === 'playing'}
                            >
                                Clear
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Clear your voice spectrogram</TooltipContent>
                    </Tooltip>
                </div>
            </>
        );

        return (
            <TooltipProvider delayDuration={400}>
            <div className="flex flex-col min-h-full">
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
            </TooltipProvider>
        );
    };

    return [
        SettingsContainer,
        (playState) => {
            if (setReferencePlayStateExport !== null) {
                setReferencePlayStateExport(playState);
            } else {
                pendingReferencePlayState = playState;
            }
        },
        (playState) => {
            if (setPracticePlayStateExport !== null) {
                setPracticePlayStateExport(playState);
            } else {
                pendingPracticePlayState = playState;
            }
        },
        (has) => {
            if (setHasReferenceExport !== null) {
                setHasReferenceExport(has);
            } else {
                pendingHasReference = has;
            }
        },
    ];
}

export default generateSettingsContainer;
