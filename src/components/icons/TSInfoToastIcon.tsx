interface Props {
    className?: string;
}
export const TSInfoToastIcon = ({ className }: Props) => {
    return (
        <svg className={className!} width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.5 26C20.4036 26 26 20.4036 26 13.5C26 6.59644 20.4036 1 13.5 1C6.59644 1 1 6.59644 1 13.5C1 20.4036 6.59644 26 13.5 26Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 12H13.5V19H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13.5 10C14.3284 10 15 9.32843 15 8.5C15 7.67157 14.3284 7 13.5 7C12.6716 7 12 7.67157 12 8.5C12 9.32843 12.6716 10 13.5 10Z" fill="currentColor" />
        </svg>
    );
};