import { ConnectionQuality } from "livekit-client";

interface Props {
  connectionQuality: ConnectionQuality;
}
export const TConnectionIndicationSm = ({ connectionQuality }: Props) => {
  if (connectionQuality === ConnectionQuality.Poor)
    return (
      <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g filter="url(#filter0_b_2853_18362)">
          <circle cx="9.5" cy="9.5" r="9.5" fill="black" fillOpacity="0.57" />
        </g>
        <path d="M7 10.75C7 10.4739 7.22386 10.25 7.5 10.25H8.75C9.02614 10.25 9.25 10.4739 9.25 10.75V12C9.25 12.2761 9.02614 12.5 8.75 12.5H7.5C7.22386 12.5 7 12.2761 7 12V10.75Z" fill="#EF4444" />
        <path d="M10 8.5C10 8.22386 10.2239 8 10.5 8H11.75C12.0261 8 12.25 8.22386 12.25 8.5V12C12.25 12.2761 12.0261 12.5 11.75 12.5H10.5C10.2239 12.5 10 12.2761 10 12V8.5Z" fill="#EF4444" />
        <defs>
          <filter id="filter0_b_2853_18362" x="-80" y="-80" width="179" height="179" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feGaussianBlur in="BackgroundImageFix" stdDeviation="40" />
            <feComposite in2="SourceAlpha" operator="in" result="effect1_backgroundBlur_2853_18362" />
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_backgroundBlur_2853_18362" result="shape" />
          </filter>
        </defs>
      </svg>
    );

  if (connectionQuality === ConnectionQuality.Good)
    return (
      <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g filter="url(#filter0_b_2853_18362)">
          <circle cx="10" cy="10.5" r="10" fill="black" fillOpacity="0.57" />
        </g>
        <path d="M5.5 12C5.5 11.7239 5.72386 11.5 6 11.5H7.25C7.52614 11.5 7.75 11.7239 7.75 12V13.25C7.75 13.5261 7.52614 13.75 7.25 13.75H6C5.72386 13.75 5.5 13.5261 5.5 13.25V12Z" fill="#FBBF24" />
        <path d="M8.5 9.75C8.5 9.47386 8.72386 9.25 9 9.25H10.25C10.5261 9.25 10.75 9.47386 10.75 9.75V13.25C10.75 13.5261 10.5261 13.75 10.25 13.75H9C8.72386 13.75 8.5 13.5261 8.5 13.25V9.75Z" fill="#FBBF24" />
        <path d="M11.5 7.5C11.5 7.22386 11.7239 7 12 7H13.25C13.5261 7 13.75 7.22386 13.75 7.5V13.25C13.75 13.5261 13.5261 13.75 13.25 13.75H12C11.7239 13.75 11.5 13.5261 11.5 13.25V7.5Z" fill="#FBBF24" />
        <defs>
          <filter id="filter0_b_2853_18362" x="-80" y="-79.5" width="180" height="180" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feGaussianBlur in="BackgroundImageFix" stdDeviation="40" />
            <feComposite in2="SourceAlpha" operator="in" result="effect1_backgroundBlur_2853_18362" />
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_backgroundBlur_2853_18362" result="shape" />
          </filter>
        </defs>
      </svg>

    );

  if (connectionQuality === ConnectionQuality.Excellent)
    return (
      <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g filter="url(#filter0_b_3136_19211)">
          <circle cx="10" cy="10.5" r="10" fill="black" fillOpacity="0.57" />
        </g>
        <path d="M4 12.75C4 12.4739 4.22386 12.25 4.5 12.25H5.75C6.02614 12.25 6.25 12.4739 6.25 12.75V14C6.25 14.2761 6.02614 14.5 5.75 14.5H4.5C4.22386 14.5 4 14.2761 4 14V12.75Z" fill="#34D399" />
        <path d="M7 10.5C7 10.2239 7.22386 10 7.5 10H8.75C9.02614 10 9.25 10.2239 9.25 10.5V14C9.25 14.2761 9.02614 14.5 8.75 14.5H7.5C7.22386 14.5 7 14.2761 7 14V10.5Z" fill="#34D399" />
        <path d="M10 8.25C10 7.97386 10.2239 7.75 10.5 7.75H11.75C12.0261 7.75 12.25 7.97386 12.25 8.25V14C12.25 14.2761 12.0261 14.5 11.75 14.5H10.5C10.2239 14.5 10 14.2761 10 14V8.25Z" fill="#34D399" />
        <path d="M13 6C13 5.72386 13.2239 5.5 13.5 5.5H14.75C15.0261 5.5 15.25 5.72386 15.25 6V14C15.25 14.2761 15.0261 14.5 14.75 14.5H13.5C13.2239 14.5 13 14.2761 13 14V6Z" fill="#34D399" />
        <defs>
          <filter id="filter0_b_3136_19211" x="-80" y="-79.5" width="180" height="180" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feGaussianBlur in="BackgroundImageFix" stdDeviation="40" />
            <feComposite in2="SourceAlpha" operator="in" result="effect1_backgroundBlur_3136_19211" />
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_backgroundBlur_3136_19211" result="shape" />
          </filter>
        </defs>
      </svg>

    );

  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g filter="url(#filter0_b_3136_19390)">
    <circle cx="10" cy="10" r="10" fill="black" fillOpacity="0.57"/>
    </g>
    <path d="M9.00506 5.5994C8.9462 5.01077 9.40844 4.5 10 4.5C10.5916 4.5 11.0538 5.01077 10.9949 5.5994L10.6074 11.9503C10.5762 12.2624 10.3136 12.5 10 12.5C9.68639 12.5 9.4238 12.2624 9.39259 11.9503L9.00506 5.5994Z" fill="#D4D4D4"/>
    <path d="M9 14.5C9 13.9477 9.44772 13.5 10 13.5C10.5523 13.5 11 13.9477 11 14.5C11 15.0523 10.5523 15.5 10 15.5C9.44772 15.5 9 15.0523 9 14.5Z" fill="#D4D4D4"/>
    <defs>
    <filter id="filter0_b_3136_19390" x="-80" y="-80" width="180" height="180" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
    <feGaussianBlur in="BackgroundImageFix" stdDeviation="40"/>
    <feComposite in2="SourceAlpha" operator="in" result="effect1_backgroundBlur_3136_19390"/>
    <feBlend mode="normal" in="SourceGraphic" in2="effect1_backgroundBlur_3136_19390" result="shape"/>
    </filter>
    </defs>
    </svg>
    
    
    )


};
