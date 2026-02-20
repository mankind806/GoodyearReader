import {handleSendMessageError} from '../../../../src/inject/utils/error';

describe('handleSendMessageError', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    it('should call cleanup and log specific message when extension context is invalidated', () => {
        const cleanup = jest.fn();
        const error = {message: 'Extension context invalidated.'};

        handleSendMessageError(error, cleanup);

        expect(consoleSpy).toHaveBeenCalledWith('Dark Reader: instance of old CS detected, cleaning up.');
        expect(cleanup).toHaveBeenCalled();
    });

    it('should log unexpected error message for other errors', () => {
        const cleanup = jest.fn();
        const error = {message: 'Some other error'};

        handleSendMessageError(error, cleanup);

        expect(consoleSpy).toHaveBeenCalledWith('Dark Reader: unexpected error during message passing.');
        expect(cleanup).not.toHaveBeenCalled();
    });

    it('should handle error being null or undefined', () => {
        const cleanup = jest.fn();

        handleSendMessageError(null, cleanup);
        expect(consoleSpy).toHaveBeenCalledWith('Dark Reader: unexpected error during message passing.');
        expect(cleanup).not.toHaveBeenCalled();

        handleSendMessageError(undefined, cleanup);
        expect(consoleSpy).toHaveBeenCalledWith('Dark Reader: unexpected error during message passing.');
        expect(cleanup).not.toHaveBeenCalled();
    });
});
