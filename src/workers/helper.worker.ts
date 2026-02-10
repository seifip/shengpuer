import { generateSpectrogram } from '../spectrogram';
import {
    ACTION_COMPUTE_SPECTROGRAM,
    ComputeSpectrogramMessage,
    Message,
} from '../worker-constants';

const workerSelf = self as unknown as {
    addEventListener(type: string, listener: (event: MessageEvent) => void): void;
    postMessage(message: unknown, transfer?: Transferable[]): void;
};

workerSelf.addEventListener('message', (event: { data: Message['request'] }) => {
    const {
        data: { action, payload },
    } = event;

    switch (action) {
        case ACTION_COMPUTE_SPECTROGRAM: {
            const {
                samplesBuffer,
                samplesStart,
                samplesLength,
                options,
            } = payload as ComputeSpectrogramMessage['request']['payload'];

            try {
                const samples = new Float32Array(samplesBuffer);
                const {
                    windowCount: spectrogramWindowCount,
                    options: spectrogramOptions,
                    spectrogram,
                } = generateSpectrogram(samples, samplesStart, samplesLength, options);

                const response: ComputeSpectrogramMessage['response'] = {
                    payload: {
                        spectrogramWindowCount,
                        spectrogramOptions,
                        spectrogramBuffer: spectrogram.buffer,
                        inputBuffer: samples.buffer,
                    },
                };
                workerSelf.postMessage(response, [spectrogram.buffer, samples.buffer] as Transferable[]);
            } catch (error) {
                const response: ComputeSpectrogramMessage['response'] = { error: error as Error };
                workerSelf.postMessage(response);
            }

            break;
        }
        default:
            workerSelf.postMessage({
                error: new Error('Unknown action'),
            });
            break;
    }
});
