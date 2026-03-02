import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
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

  if (isMobile) {
    return (
      <DrawerContent className="bg-card border-border/50">
        <div className={cn("max-h-[85vh] overflow-y-auto px-4 pb-6", className)}>
          {children}
        </div>
      </DrawerContent>
    );
  }

  return (
    <DialogContent className={cn("max-h-[90vh] overflow-y-auto", className)}>
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
