/** Resize the same asset without creating another editorial use of it. */
export function photoSize(src:string,width:number){
 if(!src.startsWith('https://images.unsplash.com/'))return src;
 const url=new URL(src);url.searchParams.set('w',String(width));url.searchParams.set('q',width<=240?'65':'82');return url.toString();
}
