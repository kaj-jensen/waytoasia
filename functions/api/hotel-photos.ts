import {createConfiguredHbxAdapter,type HbxSecretBindings} from '../../src/lib/suppliers/hbx';
export async function onRequestGet({request,env}:{request:Request;env:HbxSecretBindings}){
 const ids=(new URL(request.url).searchParams.get('ids')||'').split(',');
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 if(ids.length>24||ids.some(id=>!/^\d{1,12}$/.test(id)))return Response.json({error:'Choose up to 24 valid hotel IDs.'},{status:400,headers});
 try{const content=await createConfiguredHbxAdapter(env).hotelContents(ids,AbortSignal.timeout(12000));return Response.json({hotels:ids.map(id=>({id,imageUrl:content.get(id)?.imageUrl,status:content.get(id)?.status??'Content not returned'}))},{headers})}catch{return Response.json({error:'Hotel photographs are temporarily unavailable.'},{status:502,headers})}
}
