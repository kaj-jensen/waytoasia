/* Progressive enhancement: native form and route remain usable without JavaScript. */
for(const button of document.querySelectorAll('[data-print]'))button.addEventListener('click',()=>window.print());
for(const form of document.querySelectorAll('[data-response-form]')){
  let submitting=false;
  form.addEventListener('submit',event=>{
    if(submitting){event.preventDefault();return;}
    const note=form.querySelector('textarea');
    note.setCustomValidity('');
    if(event.submitter?.value==='change'&&!note.value.trim()){
      event.preventDefault();note.setCustomValidity(form.dataset.requiredMessage);note.reportValidity();return;
    }
    submitting=true;
    const action=document.createElement('input');action.type='hidden';action.name='action';action.value=event.submitter?.value||'approve';form.append(action);
    for(const button of form.querySelectorAll('button'))button.disabled=true;
    const feedback=form.querySelector('.response-feedback');feedback.textContent=feedback.dataset.sending;
  });
  form.querySelector('textarea').addEventListener('input',event=>event.target.setCustomValidity(''));
}
window.addEventListener('beforeprint',()=>document.querySelectorAll('.daily-itinerary details').forEach(d=>{d.dataset.wasOpen=String(d.open);d.open=true;}));
window.addEventListener('afterprint',()=>document.querySelectorAll('.daily-itinerary details').forEach(d=>{d.open=d.dataset.wasOpen==='true';}));

for(const image of document.querySelectorAll(".selected-hotel-photo,.programme-hotel-photo")){image.addEventListener("error",()=>{image.hidden=true;});if(image.complete&&!image.naturalWidth)image.hidden=true;}
