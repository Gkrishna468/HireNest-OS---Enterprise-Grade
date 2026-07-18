// Stub declarations to resolve missing node_modules types temporarily
declare module 'react' {
  export = React;
  export as namespace React;
  namespace React {
    interface HTMLAttributes<T> extends DOMAttributes<T> {
      className?: string;
    }
    interface DOMAttributes<T> {
      children?: ReactNode;
    }
    type ReactNode = any;
    function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
    function useEffect(effect: () => void | (() => void), deps?: ReadonlyArray<any>): void;
    function useRef<T>(initialValue: T): { current: T };
  }
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare module 'lucide-react' {
  export const ShieldAlert: any;
  export const AlertTriangle: any;
  export const Brain: any;
  export const Sparkles: any;
  export const MessageSquare: any;
  export const AlertCircle: any;
  export const TrendingUp: any;
  export const Search: any;
  export const UserCheck: any;
  export const DollarSign: any;
  export const Target: any;
  export const Activity: any;
  export const Send: any;
  export const Trash2: any;
  export const BookOpen: any;
  export const CheckCircle: any;
  export const HelpCircle: any;
  export const Info: any;
}

declare module 'firebase/firestore' {
  export const collection: any;
  export const getDocs: any;
  export const query: any;
  export const orderBy: any;
  export const limit: any;
}
