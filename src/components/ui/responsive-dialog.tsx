import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useScrollFocusedIntoView } from "@/hooks/useScrollFocusedIntoView";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";


interface ResponsiveDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const ResponsiveDialog = ({ open, onOpenChange, children }: ResponsiveDialogProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {children}
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog>
  );
};

const ResponsiveDialogTrigger = ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <DrawerTrigger asChild={asChild}>{children}</DrawerTrigger>;
  }

  return <DialogTrigger asChild={asChild}>{children}</DialogTrigger>;
};

interface ResponsiveDialogContentProps {
  children: React.ReactNode;
  className?: string;
}

const ResponsiveDialogContent = ({ children, className }: ResponsiveDialogContentProps) => {
  const isMobile = useIsMobile();
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  useScrollFocusedIntoView(scrollRef, isMobile);

  if (isMobile) {
    return (
      <DrawerContent className="bg-card border-border/50">
        <div
          ref={scrollRef}
          className={cn("overflow-y-auto px-4 pb-6", className)}
          style={{
            // The Drawer is already lifted above the keyboard via its `bottom` offset
            // (see drawer.tsx). Here we only need to keep the scroll area within the
            // visible portion of the drawer above the keyboard — reserve room for the
            // grabber + safe-area, and never exceed visible viewport.
            maxHeight:
              "calc(100dvh - var(--keyboard-inset-height, 0px) - 4rem - env(safe-area-inset-bottom, 0px))",
            paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {children}
        </div>
      </DrawerContent>
    );
  }

  return (
    <DialogContent className={cn(className)}>
      {children}
    </DialogContent>
  );
};


const ResponsiveDialogHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <DrawerHeader className={cn("text-left", className)}>{children}</DrawerHeader>;
  }

  return <DialogHeader className={className}>{children}</DialogHeader>;
};

const ResponsiveDialogTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <DrawerTitle className={className}>{children}</DrawerTitle>;
  }

  return <DialogTitle className={className}>{children}</DialogTitle>;
};

const ResponsiveDialogDescription = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <DrawerDescription className={className}>{children}</DrawerDescription>;
  }

  return <DialogDescription className={className}>{children}</DialogDescription>;
};

const ResponsiveDialogFooter = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <DrawerFooter className={cn("pt-4", className)}>{children}</DrawerFooter>;
  }

  return <DialogFooter className={className}>{children}</DialogFooter>;
};

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
};
