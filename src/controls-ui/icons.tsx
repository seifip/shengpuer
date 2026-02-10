import React from 'react';

interface IconProps {
    className?: string;
    style?: React.CSSProperties;
    fontSize?: 'small' | 'default';
}

const SIZE_MAP = { small: '0.85em', default: '1em' };

const FaIcon = ({ faClass, className, style, fontSize = 'default' }: IconProps & { faClass: string }) => (
    <i
        className={`${faClass}${className ? ` ${className}` : ''}`}
        style={{ fontSize: SIZE_MAP[fontSize], ...style }}
        aria-hidden="true"
    />
);

export const UploadIcon = (p: IconProps) => <FaIcon {...p} faClass="fa-solid fa-arrow-up-from-bracket" />;
export const CloseIcon = (p: IconProps) => <FaIcon {...p} faClass="fa-solid fa-xmark" />;
export const MicIcon = (p: IconProps) => <FaIcon {...p} faClass="fa-solid fa-microphone" />;
export const ExpandMoreIcon = (p: IconProps) => <FaIcon {...p} faClass="fa-solid fa-chevron-down" />;
export const SettingsIcon = (p: IconProps) => <FaIcon {...p} faClass="fa-solid fa-gear" />;
export const CameraIcon = (p: IconProps) => <FaIcon {...p} faClass="fa-solid fa-camera" />;
export const RecordDot = ({ pulsing }: { pulsing?: boolean }) => (
    <span className={`spectro-record-dot${pulsing ? ' spectro-record-dot-pulse' : ''}`} />
);
