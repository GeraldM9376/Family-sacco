"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  
  return (
    <button
      {...props}
      disabled={pending || props.disabled}
      className={`${className} disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2`}
    >
      {pending ? (
        <>
          <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
          Processing...
        </>
      ) : (
        children
      )}
    </button>
  );
}