import QRCode from 'qrcode';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const upiUrl = `upi://pay?pa=8100264108@upi&pn=UK%20MART&am=&cu=INR&tn=UK%20MART%20Payment`;
    const dataUrl = await QRCode.toDataURL(upiUrl, {
      width: 256,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
    return NextResponse.json({ qrCode: dataUrl, upiUrl });
  } catch (error) {
    console.error('QR generation error:', error);
    return NextResponse.json({ error: 'Failed to generate QR' }, { status: 500 });
  }
}