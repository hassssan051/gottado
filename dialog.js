// Native dialogs target the dialog itself for backdrop clicks.
export function outsideDialog(event){
if(event.target!==event.currentTarget)return false;
const r=event.currentTarget.getBoundingClientRect();
return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;
}
