const throwCORSError = async (url: string) => {
    return Promise.reject(new Error(
        [
            'Embedded GoodyearReader cannot access a cross-origin resource',
            url,
            'Overview your URLs and CORS policies or use',
            '`GoodyearReader.setFetchMethod(fetch: (url) => Promise<Response>))`.',
            'See if using `GoodyearReader.setFetchMethod(window.fetch)`',
            'before `GoodyearReader.enable()` works.',
        ].join(' '),
    ));
};

type Fetcher = (url: string) => Promise<Response>;

let fetcher: Fetcher = throwCORSError;

export function setFetchMethod(fetch: Fetcher): void {
    if (fetch) {
        fetcher = fetch;
    } else {
        fetcher = throwCORSError;
    }
}

export async function callFetchMethod(url: string): Promise<Response> {
    return await fetcher(url);
}
