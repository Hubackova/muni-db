// @ts-nocheck
import { getDatabase, ref, set, update } from "firebase/database";
import React, { useCallback, useMemo, useState } from "react";
import { CSVLink } from "react-csv";
import {
  useFilters,
  useGlobalFilter,
  useRowSelect,
  useSortBy,
  useTable,
} from "react-table";
import { toast } from "react-toastify";
import {
  DateCell,
  EditableCell,
  EditableNoConfirmCell,
  SelectCell,
  customComparator,
} from "../components/Cell";
import ConfirmModal from "../components/ConfirmModal";
import { GlobalFilter, Multi, multiSelectFilter } from "../components/Filter";
import IndeterminateCheckbox from "../components/IndeterminateCheckbox";
import { EXTRACTIONS, LOCI_TESTING, legend } from "../constants";
import { ReactComponent as ExportIcon } from "../images/export.svg";
import { ReactComponent as InfoIcon } from "../images/info.svg";
import { DnaExtractionsType, StorageType } from "../types";

interface NewLociTestingProps {
  storage: StorageType[];
  extractions: DnaExtractionsType[];
  testingLoci: string[];
}

const NewLociTesting: React.FC<NewLociTestingProps> = ({
  storage,
  extractions,
  testingLoci,
}) => {
  const [newColumn, setNewColumn] = useState("");
  const [isPopoverOpen, setIsPopoverOpen] = useState("");
  const [full, setFull] = useState(false);
  const [last, setLast] = useState(false);
  const [approveModal, setApproveModal] = useState(null);
  const db = getDatabase();

  const tableData = React.useMemo(
    () =>
      extractions.map((ex) => {
        const storageData = storage.find((i) => i.key === ex.box);
        return {
          ...ex,
          box: storageData?.box,
          storageSite: storageData?.storageSite,
        };
      }),
    [extractions, storage],
  );

  const setTestingList = useCallback(
    async (next) => {
      await set(ref(db, LOCI_TESTING), next.length ? next : null);
    },
    [db],
  );

  const addColumn = async (name) => {
    const trimmed = (name || "").trim();
    if (!trimmed) {
      toast.error("Column name cannot be empty.");
      return;
    }
    if (/[.#$/[\]]/.test(trimmed)) {
      toast.error('Column name cannot contain ".", "#", "$", "/", "[" or "]".');
      return;
    }
    const allKeys = Array.from(
      new Set(tableData.flatMap((row) => Object.keys(row))),
    );
    if (allKeys.includes(trimmed)) {
      toast.error(`Column "${trimmed}" already exists.`);
      return;
    }

    const obj = tableData?.length ? tableData[0] : null;
    if (!obj) return null;

    try {
      await update(ref(db, EXTRACTIONS + obj.key), { [trimmed]: "" });
      if (!testingLoci.includes(trimmed)) {
        await setTestingList([...testingLoci, trimmed]);
      }
      setNewColumn("");
      toast.success("Column was added successfully");
    } catch (err) {
      toast.error(`Failed to add column: ${err.message}`);
    }
  };

  const deleteColumnFromDB = async (accessor) => {
    if (
      !window.confirm(
        `Do you really want to delete all values in column "${accessor}"?`,
      )
    ) {
      return;
    }

    const updates = {};
    tableData.forEach((row) => {
      updates[`${EXTRACTIONS}${row.key}/${accessor}`] = null;
    });

    try {
      await update(ref(db), updates);
      if (testingLoci.includes(accessor)) {
        await setTestingList(testingLoci.filter((i) => i !== accessor));
      }
      toast.success(`Column "${accessor}" was cleared from DB.`);
    } catch (err) {
      toast.error(`Failed to delete column: ${err.message}`);
    }
  };

  const renameColumnInDB = async (accessor) => {
    const newName = window.prompt(`Rename column "${accessor}" to:`, accessor);
    if (!newName || newName === accessor) return;

    const trimmed = newName.trim();
    if (!trimmed) {
      toast.error("Column name cannot be empty.");
      return;
    }

    if (/[.#$/[\]]/.test(trimmed)) {
      toast.error('Column name cannot contain ".", "#", "$", "/", "[" or "]".');
      return;
    }

    const allKeys = Array.from(
      new Set(tableData.flatMap((row) => Object.keys(row))),
    );
    if (allKeys.includes(trimmed)) {
      toast.error(`Column "${trimmed}" already exists.`);
      return;
    }

    const updates = {};
    extractions.forEach((row) => {
      if (Object.prototype.hasOwnProperty.call(row, accessor)) {
        updates[`${EXTRACTIONS}${row.key}/${trimmed}`] = row[accessor];
        updates[`${EXTRACTIONS}${row.key}/${accessor}`] = null;
      }
    });

    try {
      await update(ref(db), updates);
      if (testingLoci.includes(accessor)) {
        const next = testingLoci.map((i) => (i === accessor ? trimmed : i));
        await setTestingList(next);
      }
      toast.success(`Column "${accessor}" was renamed to "${trimmed}".`);
    } catch (err) {
      toast.error(`Failed to rename column: ${err.message}`);
    }
  };

  const approveColumn = async (accessor) => {
    try {
      await setTestingList(testingLoci.filter((i) => i !== accessor));
      toast.success(`Column "${accessor}" was approved and moved to PCR Genomic Loci.`);
    } catch (err) {
      toast.error(`Failed to approve column: ${err.message}`);
    }
  };

  const editItem = useCallback(
    (key: string, newValue: string, id: string) => {
      update(ref(db, EXTRACTIONS + key), {
        [id]: newValue,
      });
    },
    [db],
  );

  const boxOptions = useMemo(
    () =>
      storage
        .map((i) => ({
          value: i.key,
          label: i.box,
          storageSite: i.storageSite,
        }))
        .sort(function (a, b) {
          if (a.label < b.label) {
            return -1;
          }
          if (a.label > b.label) {
            return 1;
          }
          return 0;
        }),
    [storage],
  );

  const boxOptionsWithEmpty = useMemo(
    () => [{ value: "", label: "-- empty --", storageSite: "" }, ...boxOptions],
    [boxOptions],
  );

  const DefaultCell = React.memo<React.FC<any>>(
    ({ value, row, cell }) => (
      <EditableCell
        initialValue={value}
        row={row}
        cell={cell}
        saveLast={setLast}
      />
    ),
    customComparator,
  );

  const handleRevert = () => {
    update(ref(db, EXTRACTIONS + last.rowKey), {
      [last.cellId]: last.initialValue,
    });
    last.setValue &&
      last.setValue({ value: last.initialValue, label: last.initialValue });
    setLast(false);
  };

  const NoConfirmCell = React.memo<React.FC<any>>(
    ({ value, row, cell }) => (
      <EditableNoConfirmCell
        initialValue={value}
        row={row}
        cell={cell}
        saveLast={setLast}
      />
    ),
    customComparator,
  );

  const customColumns = React.useMemo(
    () => [
      {
        Header: "Isolate code",
        accessor: "isolateCode",
        Cell: React.memo<React.FC<any>>(
          ({ row: { original } }) => (
            <input
              defaultValue={[original.isolateCode] || ""}
              className={"narrow"}
              disabled
            ></input>
          ),
          customComparator,
        ),
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "Species (original det.)",
        accessor: "speciesOrig",
        Cell: React.memo<React.FC<any>>(
          ({ row: { original } }) => <span>{original.speciesOrig}</span>,
          customComparator,
        ),
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "Species, updated name",
        accessor: "speciesUpdated",
        Cell: React.memo<React.FC<any>>(
          ({ row: { original } }) => <span>{original.speciesUpdated}</span>,
          customComparator,
        ),
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "Isolation date",
        accessor: "dateIsolation",
        Cell: React.memo<React.FC<any>>(
          ({ value: initialValue, row, cell }) => (
            <DateCell
              initialValue={initialValue}
              row={row}
              cell={cell}
              saveLast={setLast}
            />
          ),
          customComparator,
        ),
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "Box name",
        accessor: "box",
        Cell: ({ value, row, cell }) => {
          const storageData = storage.find((i) => i.box === value);
          return (
            <SelectCell
              initialValue={value}
              initialKey={storageData?.key}
              row={row}
              cell={cell}
              options={boxOptionsWithEmpty}
              saveLast={setLast}
            />
          );
        },
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "Storage site",
        accessor: "storageSite",
        Cell: ({ row: { original } }) => {
          return <span>{original?.storageSite}</span>;
        },
        Filter: Multi,
        filter: multiSelectFilter,
      },
    ],
    [boxOptionsWithEmpty, storage],
  );

  const customColumns2 = React.useMemo(
    () => [
      {
        Header: "Note on sequencing",
        accessor: "noteSequencingTesting",
        Cell: NoConfirmCell,
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "General note",
        accessor: "noteGeneralTesting",
        Cell: NoConfirmCell,
        Filter: Multi,
        filter: multiSelectFilter,
      },
    ],
    [],
  );

  const dynamicColumns = useMemo(() => {
    if (!tableData || !tableData.length) return [];
    const tableDataKeys = Array.from(
      new Set(tableData.flatMap((row) => Object.keys(row))),
    );
    return testingLoci
      .filter((i) => tableDataKeys.includes(i))
      .map((i) => ({
        Header: () => (
          <>
            <span>{i}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setApproveModal(i);
              }}
              title="Approve column → move to PCR Genomic Loci"
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#28a745",
                marginLeft: "auto",
                fontWeight: "bold",
              }}
            >
              ✓
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                renameColumnInDB(i);
              }}
              title="Rename column"
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#007bff",
              }}
            >
              ✎
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteColumnFromDB(i);
              }}
              title="Remove column"
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "red",
              }}
            >
              ✕
            </button>
          </>
        ),
        accessor: i,
        Cell: NoConfirmCell,
        Filter: Multi,
        filter: multiSelectFilter,
      }));
  }, [tableData, testingLoci]);

  const columns = React.useMemo(
    () => [...customColumns, ...dynamicColumns, ...customColumns2],
    [customColumns, customColumns2, dynamicColumns],
  );

  const tableInstance = useTable(
    {
      columns,
      data: tableData,
      initialState: { hiddenColumns: ["localityCode"] },
      defaultColumn: { Cell: DefaultCell, Filter: () => {} },
      autoResetFilters: false,
    },

    useGlobalFilter,
    useFilters,
    useSortBy,
    useRowSelect,
    (hooks) => {
      hooks.visibleColumns.push((columns) => [
        {
          id: "selection",
          Header: ({ getToggleAllRowsSelectedProps }) => (
            <div>
              <IndeterminateCheckbox {...getToggleAllRowsSelectedProps()} />
            </div>
          ),
          Cell: ({ row }) => (
            <div>
              <IndeterminateCheckbox {...row.getToggleRowSelectedProps()} />
            </div>
          ),
        },
        ...columns,
      ]);
    },
  );
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    state,
    rows,
    setGlobalFilter,
    preGlobalFilteredRows,
    selectedFlatRows,
    prepareRow,
  } = tableInstance;
  const rowsShow = full ? rows : rows.slice(0, 100);

  return (
    <>
      <div
        className="table-container"
        style={{
          height: `80vh`,
          overflow: "auto",
        }}
      >
        {approveModal && (
          <ConfirmModal
            title={`Approve column "${approveModal}"?`}
            description={`The column will be moved from New Loci Testing to PCR Genomic Loci. Cell values are kept.`}
            confirmLabel="Approve"
            onConfirm={async () => {
              await approveColumn(approveModal);
              setApproveModal(null);
            }}
            onHide={() => setApproveModal(null)}
          />
        )}
        <table className="table pcrgen" {...getTableProps()}>
          <thead>
            {headerGroups.map((headerGroup, index) => (
              <tr {...headerGroup.getHeaderGroupProps()} key={index}>
                {headerGroup.headers.map((column) => {
                  return (
                    <th key={column.id}>
                      <span
                        {...column.getHeaderProps(
                          column.getSortByToggleProps(),
                        )}
                      >
                        {column.render("Header")}
                        <span>
                          {column.isSorted
                            ? column.isSortedDesc
                              ? " ⬇️"
                              : " ⬆️"
                            : ""}
                        </span>
                      </span>
                      <div className="filter-wrapper">
                        {column.canFilter ? column.render("Filter") : null}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()}>
            {rowsShow.map((row) => {
              prepareRow(row);
              return (
                <tr {...row.getRowProps()} key={row.id}>
                  {row.cells.map((cell) => {
                    return (
                      <td
                        key={row.id + cell.column.id}
                        {...cell.getCellProps()}
                      >
                        {cell.render("Cell")}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        {isPopoverOpen && (
          <div className="popover">
            <div className="close" onClick={() => setIsPopoverOpen(false)}>
              x
            </div>
            {legend.map((i) => (
              <div key={i}>{i}</div>
            ))}
          </div>
        )}
      </div>
      <div className="controls">
        <div className="add-new">
          <input
            value={newColumn}
            onChange={(e) => setNewColumn(e.target.value)}
            placeholder="New column name"
          />
          <button onClick={() => addColumn(newColumn)}>Add</button>
        </div>
        <GlobalFilter
          preGlobalFilteredRows={preGlobalFilteredRows}
          globalFilter={state.globalFilter}
          setGlobalFilter={setGlobalFilter}
        />
        <div className="download">
          <CSVLink
            data={selectedFlatRows.map((i) => i.values)}
            filename="new-loci-testing.csv"
          >
            <div className="export">
              <ExportIcon />
              export CSV
            </div>
          </CSVLink>
          <div
            className="legend"
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          >
            <InfoIcon />
            {isPopoverOpen ? "hide legend" : "show legend"}
          </div>
        </div>
        {last?.rowKey && last.cellId !== "localityCode" && (
          <button className="revert" onClick={handleRevert}>
            Back
          </button>
        )}
        {rows.length > 100 && (
          <button onClick={() => setFull(!full)}>
            {full
              ? "show less"
              : `show more -  ${rows.length - 100} items left`}
          </button>
        )}
      </div>
    </>
  );
};

export default NewLociTesting;
