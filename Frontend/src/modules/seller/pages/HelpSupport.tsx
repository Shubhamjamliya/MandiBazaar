import React from 'react';
import { motion } from 'framer-motion';

export default function HelpSupport() {
    const supportInfo = [
        {
            title: 'Mobile Support',
            value: '8279281172',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
            ),
            link: 'tel:8279281172',
            color: 'bg-blue-50 text-blue-600 border-blue-100',
            actionName: 'Call Now'
        },
        {
            title: 'Email Support',
            value: 'mandibazaar67@gmail.com',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            ),
            link: 'mailto:mandibazaar67@gmail.com',
            color: 'bg-purple-50 text-purple-600 border-purple-100',
            actionName: 'Send Email'
        },
        {
            title: 'WhatsApp Support',
            value: 'Direct Chat with Support',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
            ),
            link: 'https://wa.me/918279281172',
            color: 'bg-green-50 text-green-600 border-green-100',
            actionName: 'Chat on WhatsApp'
        },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
            <header className="mb-10 text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-black text-[#1f2937]">Help & Support</h1>
                <p className="text-neutral-500 mt-2 text-sm sm:text-base">Get in touch with us for any assistance or queries.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {supportInfo.map((info, index) => (
                    <motion.div
                        key={info.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-6 rounded-2xl border-2 ${info.color} shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between`}
                    >
                        <div>
                            <div className={`p-3 rounded-xl inline-flex mb-4 bg-white shadow-sm border ${info.color.split(' ')[0]}`}>
                                {info.icon}
                            </div>
                            <h3 className="text-lg font-bold text-[#1f2937] mb-1">{info.title}</h3>
                            <p className="text-neutral-500 text-sm break-all mb-6">{info.value}</p>
                        </div>
                        
                        <a 
                            href={info.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm font-black uppercase tracking-wider text-center py-3 bg-white rounded-xl border border-inherit hover:bg-neutral-50 active:scale-95 transition-all shadow-sm"
                        >
                            {info.actionName}
                        </a>
                    </motion.div>
                ))}
            </div>

            <div className="mt-12 p-8 rounded-3xl bg-neutral-900 overflow-hidden relative group">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect width="100" height="100" fill="url(#grid)" />
                    </svg>
                </div>

                <div className="relative z-10 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-8">
                    <div className="max-w-md">
                        <h2 className="text-xl font-bold text-white mb-2">Frequently Asked Questions</h2>
                        <p className="text-neutral-400 text-sm">Find quick answers to common questions about managing your seller account.</p>
                    </div>
                    <button className="px-8 py-3 bg-white text-neutral-900 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-neutral-100 transition-colors shadow-lg active:scale-95">
                        Browse FAQs
                    </button>
                </div>
            </div>
        </div>
    );
}
