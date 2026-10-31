"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  
  return (
    <button
      {...props}
      disabled={pending || props.disabled}
      className={`${className} disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center gap-2`}
    >
      {pending ? (
        <>
          <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></span>
          Processing...
        </>
      ) : (
        children
      )}
    </button>
  );
}