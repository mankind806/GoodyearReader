export function handleSendMessageError(error: {message: string} | any, onCleanup: () => void): void {
    if (error && error.message === 'Extension context invalidated.') {
        console.log('Dark Reader: instance of old CS detected, cleaning up.');
        onCleanup();
    } else {
        console.log('Dark Reader: unexpected error during message passing.');
    }
}
