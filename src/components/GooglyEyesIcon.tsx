import React from 'react';
import { cn } from '../lib/utils';

interface GooglyEyesIconProps extends React.SVGProps<SVGSVGElement> {
    className?: string;
}

export const GooglyEyesIcon: React.FC<GooglyEyesIconProps> = ({ className, ...props }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("w-8 h-8", className)}
            {...props}
        >
            <circle cx="8" cy="12" r="5" />
            <circle cx="16" cy="12" r="5" />
            <circle cx="9" cy="12" r="1" fill="currentColor" />
            <circle cx="15" cy="11" r="1" fill="currentColor" />
        </svg>
    );
};
