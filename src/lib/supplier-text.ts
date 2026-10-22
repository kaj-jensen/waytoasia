import {parseFragment} from 'parse5';
// Return plain text only. Callers must retain ordinary text/HTML output escaping.
export function supplierText(value:unknown, max=1200):string {
 if(typeof value!=='string')return '';
 const fragment=parseFragment(value.slice(0,100000));
 const parts:string[]=[];
 const stack:unknown[]=[fragment];let length=0;
 while(stack.length&&length<max){
  const node=stack.pop() as {nodeName?:string;tagName?:string;value?:string;childNodes?:unknown[]};
  if(['script','style','template','noscript'].includes(node.tagName??''))continue;
  if(node.nodeName==='#text'){const text=(node.value??'').slice(0,max-length);parts.push(text);length+=text.length}
  if(node.childNodes)for(let i=node.childNodes.length-1;i>=0;i--)stack.push(node.childNodes[i]);
 }
 return parts.join('').trim().slice(0,max);
}
