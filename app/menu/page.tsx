import { QrCode } from 'lucide-react'

export default function MenuLandingPage() {
    return (
        <div className="flex h-screen bg-gray-950 items-center justify-center p-4">
            <div className="glass-card p-12 text-center max-w-sm w-full fade-in shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 brand-gradient"></div>
                <div className="w-24 h-24 brand-gradient rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-orange-500/20 rotate-3">
                    <QrCode className="w-12 h-12 text-white -rotate-3" />
                </div>
                <h1 className="text-2xl font-black text-white mb-3 tracking-tight">Scan QR Code</h1>
                <p className="text-gray-400 text-sm font-medium leading-relaxed">
                    Please scan the QR code located on your table using your smartphone camera to access the restaurant menu and place orders.
                </p>
            </div>
        </div>
    )
}
