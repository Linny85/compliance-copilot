import * as React from "react";
import { cn } from "@/lib/utils";

// Autocomplete mapping for common field names
const autocompleteMap: Record<string, string> = {
  email: 'email',
  username: 'username',
  user: 'username',
  firstname: 'given-name',
  lastname: 'family-name',
  street: 'address-line1',
  address: 'address-line1',
  address2: 'address-line2',
  city: 'address-level2',
  state: 'address-level1',
  postalcode: 'postal-code',
  zip: 'postal-code',
  country: 'country',
  phone: 'tel',
  tel: 'tel',
  password: 'current-password',
  currentpassword: 'current-password',
  newpassword: 'new-password',
  organization: 'organization',
  company: 'organization',
  url: 'url',
  birthday: 'bday',
  vat: 'tax-id',
  vatid: 'tax-id',
  taxid: 'tax-id',
  otp: 'one-time-code',
};

function guessAutocomplete(name: string): string {
  const normalized = name.toLowerCase().replace(/[-_]/g, '');
  
  for (const [key, value] of Object.entries(autocompleteMap)) {
    if (normalized.includes(key)) {
      return value;
    }
  }
  
  return 'off';
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  name: string; // Required for proper form handling
  error?: string;
}

/**
 * Accessible form input component with automatic autocomplete detection
 * 
 * Features:
 * - Automatic id generation from name if not provided
 * - Smart autocomplete attribute based on field name
 * - Proper label association for accessibility
 * - Error message display with aria-describedby
 * 
 * @example
 * <Input 
 *   name="email" 
 *   label="Email Address" 
 *   type="email"
 *   required 
 * />
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, name, autoComplete, required, error, className, ...rest }, ref) => {
    const inputId = id || name;
    const errorId = error ? `${inputId}-error` : undefined;
    const ac = autoComplete ?? guessAutocomplete(name);

    return (
      <div className="space-y-1.5">
        {label && (
          <label 
            htmlFor={inputId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </label>
        )}
        <input
          id={inputId}
          name={name}
          autoComplete={ac}
          ref={ref}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={errorId}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "md:text-sm",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          {...rest}
        />
        {error && (
          <p 
            id={errorId}
            className="text-sm font-medium text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
