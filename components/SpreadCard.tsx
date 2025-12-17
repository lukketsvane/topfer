import React from 'react';
import { SpreadImage } from '../types';

interface SpreadCardProps {
  image: SpreadImage;
  index: number;
}

const SpreadCard: React.FC<SpreadCardProps> = ({ image, index }) => {
  return (
    <div className="w-full mb-8 animate-fade-in-up">
      <div className="relative w-full aspect-[3/2] overflow-hidden rounded-xl shadow-lg bg-white border border-gray-100 group transition-all duration-300 hover:shadow-xl">
        <img 
          src={image.url} 
          alt={`Spread ${index + 1}`} 
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white text-[10px] font-medium px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
           Spread {index + 1}
        </div>
        <a 
            href={image.url} 
            download={`spread_${index + 1}.png`}
            className="absolute bottom-3 right-3 bg-white text-black text-[12px] font-semibold px-3 py-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-gray-50 active:scale-95"
        >
            Download
        </a>
      </div>
    </div>
  );
};

export default SpreadCard;