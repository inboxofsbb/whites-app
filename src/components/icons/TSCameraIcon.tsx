interface Props {
    className?: string;
}
export const TSCameraIcon = ({ className }: Props) => {
    return (
        <svg className={className!}  viewBox="0 0 29 22" fill="currentcolor" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M19 7.38197L25 4.38197V17.618L19 14.618V16C19 17.1046 18.1046 18 17 18H5C3.89543 18 3 17.1046 3 16V6C3 4.89543 3.89543 4 5 4H17C18.1046 4 19 4.89543 19 6V7.38197ZM19 9.61803V12.382L23 14.382V7.61803L19 9.61803ZM5 6V16H17V6H5Z" fill="currentcolor" />
        </svg>
    );
};