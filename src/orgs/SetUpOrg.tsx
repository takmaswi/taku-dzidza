import { useMutation } from "convex/react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../../convex/_generated/api";
import { copy } from "../copy/en";
import { OrgFields } from "./OrgSearch";

/** "Set up my school or institution", for adults only (the server checks again): a pending organisation with this person as its admin. */
export function SetUpOrg() {
  const t = copy.orgs;
  const setUp = useMutation(api.organisations.organisations.setUp);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" className="pill small ghost" onClick={() => setOpen(true)}>
        {t.setUp}
      </button>
    );
  }
  return (
    <OrgFields
      title={t.setUpTitle}
      line={t.setUpLine}
      submitLabel={t.setUpSubmit}
      onCancel={() => setOpen(false)}
      onSubmit={async (fields) => {
        const id = await setUp(fields);
        navigate(`/org/${id}`);
      }}
    />
  );
}
