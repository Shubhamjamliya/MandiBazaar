import React from 'react';
import { motion } from 'framer-motion';

// Using regular import from assets, Vite will handle this with alias
import outOfLocationImg from '@assets/outoflocation.png';

interface OutOfLocationProps {
  onChangeLocation: () => void;
}

export default function OutOfLocation({ onChangeLocation }: OutOfLocationProps) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 text-center bg-white">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        <img 
          src={outOfLocationImg} 
          alt="Out of Location" 
          className="w-full h-full object-cover"
        />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative z-10 bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-2xl max-w-md w-full border border-white/50"
      >
        <h2 className="text-2xl font-black text-gray-800 mb-3">
          Location Unserviceable
        </h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto text-sm md:text-base leading-relaxed">
          Oops! It seems we don't serve your current location yet. But don't worry, we are expanding quickly! Please select a different location to continue exploring Mandi Bazaar.
        </p>
        
        <button
          onClick={onChangeLocation}
          className="px-6 py-2.5 mt-6 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 inline-block"
        >
          Change Location
        </button>
      </motion.div>
    </div>
  );
}
