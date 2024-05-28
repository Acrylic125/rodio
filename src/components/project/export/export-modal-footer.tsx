import { Button } from "../../ui/button";
import { DialogFooter } from "../../ui/dialog";

export function ModalFooter({
  nextPage,
  prevPage,
}: {
  nextPage?: () => void;
  prevPage?: () => void;
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