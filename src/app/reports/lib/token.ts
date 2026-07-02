export function getBackofficeToken(): string {
    return (
        localStorage.getItem('backoffice_token') ||
        sessionStorage.getItem('backoffice_token') ||
        ''
    );
}
