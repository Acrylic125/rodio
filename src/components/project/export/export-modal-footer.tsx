import { Button } from "../../ui/button";
import { DialogFooter } from "../../ui/dialog";

export function ExportModalFooter({
  nextPage,
  prevPage,
}: {
  prevPage?: () => void;
} & {
  nextPage?: () => void;
}) {
  return (
    <DialogFooter>
      <Button
        variant="secondary"
        disabled={!prevPage}
        onMouseDown={prevPage}
        type="button"
      >
        Back
      </Button>
      <Button disabled={!nextPage} onMouseDown={nextPage} type="button">
        Next
      </Button>
    </DialogFooter>
  );
}
