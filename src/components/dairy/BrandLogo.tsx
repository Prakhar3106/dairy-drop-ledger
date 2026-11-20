interface BrandLogoProps {
  inverted?: boolean | undefined;
  className?: string | undefined;
}

export function BrandLogo({ inverted = false, className = '' }: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 ${className}`}>
      <svg width="30" height="30" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0">
        <path
          d="M18 3.5C18 3.5 7.5 15.2 7.5 22.3C7.5 28.1 12.2 32.5 18 32.5C23.8 32.5 28.5 28.1 28.5 22.3C28.5 15.2 18 3.5 18 3.5Z"
          className={inverted ? 'fill-milk' : 'fill-forest'}
        />
        <path
          d="M18 27.2C14.8 27.2 12.8 24.7 13.4 21.5C14.1 17.9 18.6 15.2 22.3 15.5C22.6 19.2 20.9 27.2 18 27.2Z"
          className={inverted ? 'fill-leaf' : 'fill-cream'}
        />
        <path
          d="M17.5 26.8C17.8 23.2 19.3 19.8 21.6 17.1"
          className={inverted ? 'stroke-deep' : 'stroke-leaf'}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <span className={`font-display text-xl font-bold tracking-tight ${inverted ? 'text-milk' : 'text-deep'}`}>DairySetu</span>
    </span>
  );
}
