import React from 'react';
import { createRoot } from 'react-dom/client';

import '../globals.css';

import { VoiceGender } from '../pinyin-data';
import { RenderParameters } from '../spectrogram-render';

import generateSettingsContainer from './SettingsContainer';
import { PlayState } from './SettingsContainer';

export default function initialiseControlsUi(
    container: Element,
    props: {
        stopReferenceCallback: () => void;
        stopPracticeCallback: () => void;
        clearReferenceCallback: () => void;
        clearPracticeCallback: () => void;
        renderParametersUpdateCallback: (settings: Partial<RenderParameters>) => void;
        renderFromMicrophoneCallback: () => void;
        renderFromFileCallback: (file: ArrayBuffer) => void;
        loadPinyinPresetCallback: (syllable: string, gender: VoiceGender) => void;
        replayReferenceCallback: () => void;
        reRecordCallback: () => void;
    }
): { setReferencePlayState: (state: PlayState) => void; setPracticePlayState: (state: PlayState) => void; setHasReference: (has: boolean) => void } {
    const [SettingsContainer, setReferencePlayState, setPracticePlayState, setHasReference] =
        generateSettingsContainer();

    const root = createRoot(container);
    root.render(
        <SettingsContainer
            onStopReference={props.stopReferenceCallback}
            onStopPractice={props.stopPracticeCallback}
            onClearReference={props.clearReferenceCallback}
            onClearPractice={props.clearPracticeCallback}
            onRenderParametersUpdate={props.renderParametersUpdateCallback}
            onRenderFromMicrophone={props.renderFromMicrophoneCallback}
            onRenderFromFile={props.renderFromFileCallback}
            onLoadPinyinPreset={props.loadPinyinPresetCallback}
            onReplayReference={props.replayReferenceCallback}
            onReRecord={props.reRecordCallback}
        />
    );

    return { setReferencePlayState, setPracticePlayState, setHasReference };
}
