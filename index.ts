import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const json = (body: unknown, status=200) => new Response(JSON.stringify(body), {status, headers:cors});

function normalizeIndiaPhone(value:string){
  const digits=value.replace(/\D/g,"");
  if(digits.startsWith("91") && digits.length===12) return digits;
  if(digits.length===10) return "91"+digits;
  throw new Error("Enter a valid Indian 10-digit mobile number.");
}

serve(async (req) => {
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  try{
    const auth=req.headers.get("Authorization");
    if(!auth) return json({error:"Unauthorized"},401);

    const WA_TOKEN=Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const PHONE_NUMBER_ID=Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    if(!WA_TOKEN || !PHONE_NUMBER_ID) return json({error:"WhatsApp secrets are not configured."},500);

    const {phone,invoice_no,total,document_url}=await req.json();
    const to=normalizeIndiaPhone(String(phone||""));
    if(!document_url) return json({error:"Invoice document URL is required."},400);

    const endpoint=`https://graph.facebook.com/v23.0/${PHONE_NUMBER_ID}/messages`;
    const response=await fetch(endpoint,{
      method:"POST",
      headers:{"Authorization":`Bearer ${WA_TOKEN}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        messaging_product:"whatsapp",
        recipient_type:"individual",
        to,
        type:"document",
        document:{link:document_url,caption:`Invoice ${invoice_no} • Total ${Number(total||0).toLocaleString("en-IN",{style:"currency",currency:"INR"})}`,filename:`${invoice_no}.pdf`}
      })
    });
    const data=await response.json();
    if(!response.ok) return json({error:data?.error?.message||"WhatsApp API error",details:data},response.status);
    return json({ok:true,data});
  }catch(e){
    return json({error:e instanceof Error?e.message:"Unknown error"},400);
  }
});
