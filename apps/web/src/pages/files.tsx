import { TableSearch } from "../components/ui/table";
import { PAGE_SIZE } from "../lib/pagination";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Upload, FileText, Download, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { Page } from "@market/contracts";
import { api, errorText, queryClient } from "../lib/api";
import { useScope, PageHeading } from "../components/shell";
import { Button } from "../components/ui/button";
import {
  Loading,
  ErrorState,
  Empty,
  Badge,
  Modal,
  Pagination,
} from "../components/ui/common";
interface StoredFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: string;
  createdAt: string;
}
export function FilesPage() {
  const s = useScope();
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [progress, setProgress] = useState<number | null>(null),
    [deleting, setDeleting] = useState<StoredFile>(),
    [last, setLast] = useState<File>(),
    [failed, setFailed] = useState(false),
    [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    xhr = useRef<XMLHttpRequest | null>(null),
    reserved = useRef<string | null>(null),
    alive = useRef(true);
  const q = useQuery({
    queryKey: [...s.key, "files", page, search, PAGE_SIZE],
    queryFn: ({ signal }) =>
      api<Page<StoredFile>>(
        `${s.prefix}/files?page=${page}&pageSize=${PAGE_SIZE}&search=${encodeURIComponent(search)}`,
        "GET",
        undefined,
        signal,
      ),
  });
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      xhr.current?.abort();
    };
  }, []);
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: [...s.key, "files"] });
  async function upload(file?: File) {
    if (!file || progress !== null) return;
    setLast(file);
    setFailed(false);
    const ext = file.name.split(".").at(-1)?.toLowerCase();
    const types: Record<string, string> = {
      pdf: "application/pdf",
      csv: "text/csv",
      txt: "text/plain",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
    if (!ext || !types[ext] || file.size > 26214400 || file.size === 0) {
      toast.error(t("errors.UPLOAD_INVALID"));
      return;
    }
    setProgress(0);
    try {
      const result = await s.call<{
        file: StoredFile;
        upload: { url: string; fields: Record<string, string> };
      }>(s.prefix + "/files", "POST", {
        name: file.name,
        size: file.size,
        type: types[ext],
      });
      reserved.current = result.file.id;
      await new Promise<void>((resolve, reject) => {
        const req = new XMLHttpRequest();
        xhr.current = req;
        req.open("POST", result.upload.url);
        req.upload.onprogress = (e) => {
          if (alive.current && e.lengthComputable)
            setProgress(Math.round((e.loaded / e.total) * 100));
        };
        req.onload = () =>
          req.status >= 200 && req.status < 300
            ? resolve()
            : reject(new Error("upload failed"));
        req.onerror = () => reject(new Error("network"));
        req.onabort = () => reject(new DOMException("Aborted", "AbortError"));
        const form = new FormData();
        for (const [k, v] of Object.entries(result.upload.fields))
          form.append(k, v);
        form.append("file", file);
        req.send(form);
      });
      if (!alive.current) return;
      await s.call(`${s.prefix}/files/${result.file.id}/finalize`, "POST", {});
      toast.success(t("files.success"));
      setLast(undefined);
      await refresh();
      void queryClient.invalidateQueries({
        queryKey: [...s.key, "notifications"],
      });
    } catch (e) {
      if (alive.current) {
        setFailed(true);
        toast.error(errorText(e));
        await refresh();
      }
    } finally {
      if (alive.current) setProgress(null);
      reserved.current = null;
    }
  }
  const cancel = () => {
    xhr.current?.abort();
    if (reserved.current)
      void s
        .call(`${s.prefix}/files/${reserved.current}`, "DELETE")
        .then(refresh)
        .catch(() => {});
  };
  if (s.tenant?.role === "USER") return <Empty title={t("shell.forbidden")} />;
  return (
    <main className="page">
      <PageHeading title={t("shell.files")} description={t("files.sub")}>
        <Button
          onClick={() => input.current?.click()}
          disabled={progress !== null}
        >
          <Upload />
          {t("files.upload")}
        </Button>
      </PageHeading>
      <input
        hidden
        ref={input}
        type="file"
        accept=".pdf,.csv,.xlsx,.txt"
        aria-label={t("files.upload")}
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div
        className="dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void upload(e.dataTransfer.files[0]);
        }}
      >
        <Upload />
        <button
          className="text-button"
          onClick={() => input.current?.click()}
          disabled={progress !== null}
        >
          {t("files.drop")}
        </button>
        <p>{t("files.limits")}</p>
      </div>
      {progress !== null && (
        <div className="upload-progress" role="status">
          <span>
            {t(progress === 100 ? "files.verifying" : "files.progress", {
              progress,
            })}
          </span>
          <progress max={100} value={progress} />
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("common.cancel")}
            onClick={cancel}
          >
            <X />
          </Button>
        </div>
      )}
      {failed && last && (
        <Button variant="outline" onClick={() => void upload(last)}>
          {t("common.retry")} · {last.name}
        </Button>
      )}
      <div className="table-toolbar">
        <TableSearch
          aria-label={t("common.search")}
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      ) : !q.data.items.length ? (
        <Empty />
      ) : (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t("common.name")}</th>
                  <th>{t("files.size")}</th>
                  <th>{t("common.status")}</th>
                  <th>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {q.data.items.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <span className="file-name">
                        <FileText />
                        {f.name}
                      </span>
                    </td>
                    <td>
                      {new Intl.NumberFormat(i18n.language, {
                        maximumFractionDigits: 1,
                      }).format(f.size / 1024)}{" "}
                      KiB
                    </td>
                    <td>
                      <Badge status={f.status} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={f.status !== "available"}
                          aria-label={t("files.download") + " " + f.name}
                          onClick={() =>
                            void s
                              .call<{ url: string }>(
                                `${s.prefix}/files/${f.id}/download`,
                                "POST",
                                {},
                              )
                              .then(({ url }) => {
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = f.name;
                                a.rel = "noreferrer";
                                a.click();
                              })
                              .catch((e) => toast.error(errorText(e)))
                          }
                        >
                          <Download />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("common.delete") + " " + f.name}
                          onClick={() => setDeleting(f)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            total={q.data.total}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        </>
      )}
      <Modal
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={t("common.delete")}
        description={t("files.deleteConfirm", { name: deleting?.name })}
      >
        <div className="dialog-actions">
          <Button variant="outline" onClick={() => setDeleting(undefined)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => {
              if (!deleting) return;
              setBusy(true);
              void s
                .call(`${s.prefix}/files/${deleting.id}`, "DELETE")
                .then(() => {
                  setDeleting(undefined);
                  toast.success(t("common.saved"));
                  return refresh();
                })
                .catch((e) => toast.error(errorText(e)))
                .finally(() => setBusy(false));
            }}
          >
            {t(busy ? "common.saving" : "common.delete")}
          </Button>
        </div>
      </Modal>
    </main>
  );
}
