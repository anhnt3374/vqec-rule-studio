import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
