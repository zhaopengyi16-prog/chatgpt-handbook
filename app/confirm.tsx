'use client';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
export function Confirm({value,onClose}:{value:null|{title:string,message:string,action:()=>void},onClose:()=>void}){
 return <AlertDialog open={!!value} onOpenChange={open=>{if(!open)onClose();}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{value?.title}</AlertDialogTitle><AlertDialogDescription>{value?.message}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={()=>{value?.action();onClose();}}>确认</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}
