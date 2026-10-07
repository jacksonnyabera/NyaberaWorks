import { Container } from "@/components/ui/Section";
import { Skeleton } from "@/components/ui/states";

export default function Loading() {
  return (
    <Container className="py-20" >
      <div aria-busy="true" aria-label="Loading page" className="space-y-5">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="mt-10 h-64 w-full" />
      </div>
    </Container>
  );
}
