/** Resize the same asset without creating another editorial use of it. */
export function photoSize(src:string,width:number){
 if(src.startsWith('/images/destinations/south-korea-hero-'))return src.replace(/-\d+\.webp$/,`-${[480,768,1200,1600,2200].find(size=>size>=width)||2200}.webp`);
 if(src.startsWith('/images/destinations/vietnam-boat-'))return src.replace(/-\d+\.jpg$/,`-${[480,768,1200,2448].find(size=>size>=width)||2448}.jpg`);
 if(src.startsWith('/images/destinations/thailand-temple-'))return src.replace(/-\d+\.jpg$/,`-${[480,768,1200,2536].find(size=>size>=width)||2536}.jpg`);
 if(src.startsWith('/images/tours/korea-market-'))return src.replace(/-\d+\.jpg$/,`-${[480,768,1200,1920,2400].find(size=>size>=width)||2400}.jpg`);
 if(src.startsWith('/images/tours/china-rivers-'))return src.replace(/-\d+\.jpg$/,`-${[480,768,1200,1920,2400].find(size=>size>=width)||2400}.jpg`);
 if(!src.startsWith('https://images.unsplash.com/'))return src;
 const url=new URL(src);url.searchParams.set('w',String(width));url.searchParams.set('q',width<=240?'65':'82');return url.toString();
}

/** Let the browser choose a download matching the rendered image width. */
export function photoSrcSet(src:string,widths=[480,768,1200,1600,2200]){
 if(!src.startsWith('https://images.unsplash.com/')&&!src.startsWith('/images/destinations/south-korea-hero-')&&!src.startsWith('/images/destinations/vietnam-boat-')&&!src.startsWith('/images/destinations/thailand-temple-')&&!src.startsWith('/images/tours/korea-market-')&&!src.startsWith('/images/tours/china-rivers-'))return undefined;
 return widths.map(width=>`${photoSize(src,width)} ${width}w`).join(', ');
}
