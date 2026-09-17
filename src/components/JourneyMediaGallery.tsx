import {useRef,useState} from 'react';
import {photoSize} from '../lib/photoSize';
export type JourneyMedia={type:'image';src:string;caption:string;alt:string};
type Labels={gallery:string;view:string;enlarge:string;previous:string;next:string;close:string};
const defaults:Labels={gallery:'Gallery',view:'View gallery',enlarge:'Enlarge photograph',previous:'Previous photograph',next:'Next photograph',close:'Close gallery'};
export default function JourneyMediaGallery({items,name,labels=defaults}:{items:JourneyMedia[];name:string;labels?:Labels}){
 const [index,setIndex]=useState(0);
 const dialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLButtonElement>(null);
 const item=items[index];
 const select=(next:number)=>setIndex((next+items.length)%items.length);
 function close(){dialog.current?.close();document.body.style.overflow='';opener.current?.focus();}
 function open(){dialog.current?.showModal();document.body.style.overflow='hidden';}
 const thumbs=(modal=false)=><div className="media-thumbnails" aria-label={labels.gallery}>{items.map((entry,i)=><button key={entry.src} type="button" aria-label={entry.caption} aria-pressed={i===index} onClick={()=>select(i)}><img src={photoSize(entry.src,240)} alt="" width="240" height="160" loading="lazy" fetchPriority="low"/>{modal&&<span className="sr-only">{i+1}</span>}</button>)}</div>;
 return <div className="journey-media" aria-label={`${name} · ${labels.gallery}`}><div className="media-main"><img src={item.src} alt={item.alt} fetchPriority="high"/><button className="media-open" type="button" ref={opener} onClick={open} aria-label={labels.enlarge}>⛶ {labels.view}</button><button className="media-prev" type="button" onClick={()=>select(index-1)} aria-label={labels.previous}>‹</button><button className="media-next" type="button" onClick={()=>select(index+1)} aria-label={labels.next}>›</button><div className="media-caption" aria-live="polite"><span>{item.caption}</span><span>{index+1} / {items.length}</span></div></div>{thumbs()}<dialog className="media-dialog" ref={dialog} aria-label={`${name} · ${labels.gallery}`} onCancel={e=>{e.preventDefault();close();}} onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();select(index+1);}if(e.key==='ArrowLeft'){e.preventDefault();select(index-1);}}}><div className="media-dialog-top"><span>{name} · {labels.gallery}</span><button type="button" onClick={close} autoFocus aria-label={labels.close}>{labels.close} ×</button></div><div className="media-enlarged"><img src={item.src} alt={item.alt}/><button type="button" className="media-prev" onClick={()=>select(index-1)} aria-label={labels.previous}>‹</button><button type="button" className="media-next" onClick={()=>select(index+1)} aria-label={labels.next}>›</button></div><div className="media-dialog-caption" aria-live="polite">{item.caption}<span>{index+1} / {items.length}</span></div>{thumbs(true)}</dialog></div>;
}
