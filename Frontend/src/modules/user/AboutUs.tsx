import { useNavigate } from 'react-router-dom';

export default function AboutUs() {
    const navigate = useNavigate();

    return (
        <div className="pb-24 md:pb-8 bg-white min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-b from-teal-50 to-white pb-6 pt-4 sticky top-0 z-10 border-b border-neutral-100">
                <div className="px-4 md:px-6 lg:px-8">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="text-neutral-900"
                            aria-label="Back"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <h1 className="text-xl font-bold text-neutral-900">About Mandi Bazaar</h1>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-4 md:px-6 lg:px-8 py-6 max-w-3xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 md:p-8">
                    
                    {/* Intro */}
                    <div className="mb-8">
                        <p className="text-sm md:text-base text-neutral-700 leading-relaxed mb-4">
                            <strong>Mandi Bazaar</strong> is a Udaipur-based fresh fruits and vegetables marketplace, created to make everyday grocery shopping easier, more convenient, and more affordable.
                        </p>
                        <p className="text-sm md:text-base text-neutral-700 leading-relaxed">
                            We bring <strong>fresh vegetables and fruits directly to customers</strong>, with a focus on quality, competitive prices, convenience, and reliable service. Customers can browse products, check prices, place orders through the Mandi Bazaar app, and get their orders delivered to their doorstep.
                        </p>
                    </div>

                    {/* Mission */}
                    <div className="mb-8">
                        <h3 className="text-lg md:text-xl font-bold text-neutral-900 mb-3 text-teal-600">Our Mission</h3>
                        <p className="text-sm md:text-base text-neutral-700 leading-relaxed mb-4">
                            Our mission is to make fresh fruits and vegetables easily accessible to every household while providing <strong>good quality products at fair and competitive prices</strong>.
                        </p>
                        <p className="text-sm md:text-base text-neutral-700 leading-relaxed">
                            We aim to connect local markets with customers through a simple and reliable digital platform.
                        </p>
                    </div>

                    {/* Vision */}
                    <div className="mb-8">
                        <h3 className="text-lg md:text-xl font-bold text-neutral-900 mb-3 text-teal-600">Our Vision</h3>
                        <p className="text-sm md:text-base text-neutral-700 leading-relaxed mb-4">
                            Our vision is to build a trusted digital marketplace for fresh fruits and vegetables, starting from <strong>Udaipur City</strong> and expanding to more cities across India.
                        </p>
                        <p className="text-sm md:text-base text-neutral-700 leading-relaxed">
                            We want to make buying fresh produce as simple as <strong>opening the Mandi Bazaar app, choosing your products, placing your order, and receiving them at your doorstep.</strong>
                        </p>
                    </div>

                    {/* Services */}
                    <div className="mb-8">
                        <h3 className="text-lg md:text-xl font-bold text-neutral-900 mb-3 text-teal-600">Our Services</h3>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm md:text-base text-neutral-700">
                            <li className="flex items-center gap-2"><span>🥬</span> Fresh vegetables</li>
                            <li className="flex items-center gap-2"><span>🍎</span> Fresh fruits</li>
                            <li className="flex items-center gap-2"><span>🛒</span> Online ordering through the Mandi Bazaar app</li>
                            <li className="flex items-center gap-2"><span>🏠</span> Home delivery</li>
                            <li className="flex items-center gap-2"><span>💰</span> Competitive and market-based prices</li>
                            <li className="flex items-center gap-2"><span>📦</span> Convenient doorstep delivery</li>
                            <li className="flex items-center gap-2"><span>📱</span> Easy and simple ordering experience</li>
                            <li className="flex items-center gap-2"><span>🔄</span> Regularly updated product availability and prices</li>
                        </ul>
                    </div>

                    {/* Starting from Udaipur */}
                    <div className="mb-8">
                        <h3 className="text-lg md:text-xl font-bold text-neutral-900 mb-3 text-teal-600">Starting from Udaipur</h3>
                        <p className="text-sm md:text-base text-neutral-700 leading-relaxed mb-4">
                            <strong>Mandi Bazaar started its journey in Udaipur City, Rajasthan</strong>, with the vision of bringing the convenience of a digital mandi directly to customers' homes.
                        </p>
                        <p className="text-sm md:text-base text-neutral-700 leading-relaxed">
                            We are continuously working to improve our products, technology, delivery service, and customer experience.
                        </p>
                    </div>

                    {/* Helpline */}
                    <div className="bg-teal-50 rounded-xl p-5 border border-teal-100 text-center mb-8">
                        <h3 className="text-lg font-bold text-neutral-900 mb-2">Helpline</h3>
                        <p className="text-xl font-bold text-teal-600 mb-3 flex items-center justify-center gap-2">
                            <span>📞</span> 8279281172
                        </p>
                        <p className="text-sm text-neutral-600">
                            For any assistance related to products, orders, delivery, or the Mandi Bazaar app, please contact our helpline.
                        </p>
                    </div>

                    {/* Slogan */}
                    <div className="text-center pt-4 border-t border-neutral-100">
                        <p className="text-lg font-bold text-teal-700 italic">
                            "Mandi Bazaar — Sabse Sasta, Sabse Achha."
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
