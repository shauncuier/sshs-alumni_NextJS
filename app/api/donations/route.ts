import { NextResponse } from "next/server";
import { sampleDonations } from "@/lib/data";

export async function GET() {
  try {
    return NextResponse.json({ campaigns: sampleDonations });
  } catch (error) {
    console.error("Donations GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { campaignId, amount, donorName, email, paymentMethod } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid donation amount" }, { status: 400 });
    }

    const receiptId = `SSGHS-DON-${Date.now().toString().slice(-6)}`;

    return NextResponse.json(
      {
        message: "Thank you for your generous contribution to SSGHS!",
        receipt: {
          receiptId,
          campaignId,
          amount,
          donorName: donorName || "Anonymous Alumnus",
          email,
          paymentMethod: paymentMethod || "bKash",
          date: new Date().toISOString(),
          status: "RECEIVED",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Donations POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
