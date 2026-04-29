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
  customLocalityComparator,
} from "../components/Cell";
import ConfirmModal from "../components/ConfirmModal";
import { GlobalFilter, Multi, multiSelectFilter } from "../components/Filter";
import IndeterminateCheckbox from "../components/IndeterminateCheckbox";
import { EXTRACTIONS, LOCI_TESTING, legend } from "../constants";
import { ReactComponent as ExportIcon } from "../images/export.svg";
import { ReactComponent as InfoIcon } from "../images/info.svg";
import { DnaExtractionsType, StorageType } from "../types";

interface PcrGenomicLociProps {
  storage: StorageType[];
  extractions: DnaExtractionsType[];
  testingLoci: string[];
}

const NEW_LOCI_TESTING_ONLY_KEYS = [
  "noteSequencingTesting",
  "noteGeneralTesting",
];

const PcrGenomicLoci: React.FC<PcrGenomicLociProps> = ({
  storage,
  extractions,
  testingLoci,
}) => {
  const [newColumn, setNewColumn] = useState("");
  const [isPopoverOpen, setIsPopoverOpen] = useState("");
  const [full, setFull] = useState(false);
  const [last, setLast] = useState(false);
  const db = getDatabase();
  const [selectedItem, setSelectedItem] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(null);
  const [showRemoveModal, setShowRemoveModal] = useState(null);

  const removeIsolateFromGroup = (isolateCode) => {
    const group = extractions.filter(
      (i) => i.isolateCodeGroup && i.isolateCodeGroup.includes(isolateCode),
    );

    const removedItem = extractions.find((i) => i.isolateCode === isolateCode);

    group.forEach((groupItem) =>
      update(ref(db, EXTRACTIONS + groupItem.key), {
        isolateCodeGroup: groupItem.isolateCodeGroup.filter(
          (i) => i !== isolateCode,
        ),
      }),
    );

    update(ref(db, EXTRACTIONS + removedItem.key), {
      isolateCodeGroup: "",
    });
  };

  const tableData = React.useMemo(
    () =>
      extractions.map((ex) => {
        const {
          kit,
          speciesUpdated,
          altitude,
          collector,
          dateCollection,
          habitat,
          latitude,
          longitude,
          ...data
        } = ex;
        const storageData = storage.find((i) => i.key === ex.box);
        return {
          ...data,
          box: storageData?.box,
          storageSite: storageData?.storageSite,
        };
      }),
    [extractions, storage],
  );

  const addColumn = (name) => {
    const obj = tableData?.length ? tableData[0] : null;
    if (!obj) return null;
    update(ref(db, EXTRACTIONS + obj.key), {
      [name]: "",
    });
    toast.success("Column was added successfully");
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
      updates[`${EXTRACTIONS}${row.key}/${accessor}`] = null; // null = odstraní hodnotu v Realtime DB
    });

    try {
      await update(ref(db), updates);
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
        await set(ref(db, LOCI_TESTING), next);
      }
      toast.success(`Column "${accessor}" was renamed to "${trimmed}".`);
    } catch (err) {
      toast.error(`Failed to rename column: ${err.message}`);
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

  const LocalityCell = React.memo<React.FC<any>>(
    ({ value, row, cell }) => (
      <EditableCell
        initialValue={value}
        row={row}
        cell={cell}
        disabled={row.original.localityCode}
        saveLast={setLast}
      />
    ),
    customLocalityComparator,
  );

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
        Header: "Project",
        accessor: "project",
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
        Header: "ng/ul",
        accessor: "ngul",
        Cell: React.memo<React.FC<any>>(
          ({ value, row, cell }) => (
            <EditableCell
              initialValue={value}
              row={row}
              cell={cell}
              type="number"
              step=".00001"
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
      {
        Header: "Country",
        accessor: "country",
        Cell: LocalityCell,
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "State/province",
        accessor: "state",
        Cell: LocalityCell,
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "Locality name",
        accessor: "localityName",
        Cell: LocalityCell,
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "cytB",
        accessor: "cytB",
        Cell: NoConfirmCell,
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "16S",
        accessor: "16S",
        Cell: NoConfirmCell,
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "COI",
        accessor: "COI",
        Cell: NoConfirmCell,
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "COII",
        accessor: "COII",
        Cell: NoConfirmCell,
        Filter: Multi,
        filter: multiSelectFilter,
      },

      {
        Header: "ITS1",
        accessor: "ITS1",
        Cell: NoConfirmCell,
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "ITS2",
        accessor: "ITS2",
        Cell: NoConfirmCell,
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "ELAV",
        accessor: "ELAV",
        Cell: NoConfirmCell,
        Filter: Multi,
        filter: multiSelectFilter,
      },
    ],
    [boxOptions, editItem],
  );

  const customColumns2 = React.useMemo(
    () => [
      {
        Header: "Note on PCR",
        accessor: "notePCR",
        Cell: NoConfirmCell,
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "Note on sequencing",
        accessor: "noteSequencing",
        Cell: NoConfirmCell,
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "General note",
        accessor: "noteGeneral",
        Cell: NoConfirmCell,
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "Position",
        accessor: "position",
        Cell: NoConfirmCell,
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "Status",
        accessor: "status",
        Cell: NoConfirmCell,
        Filter: Multi,
        filter: multiSelectFilter,
      },
    ],
    [],
  );

  const getColumnsAccessor = useCallback(
    (tableData) => {
      if (!tableData || !tableData.length) return [];
      const customKeys = [...customColumns, ...customColumns2].map(
        (i) => i.accessor,
      );
      // Získání všech unikátních klíčů z celého tableData
      const tableDataKeys = Array.from(
        new Set(tableData.flatMap((row) => Object.keys(row))),
      );

      return tableDataKeys
        .filter((i) => i !== "isolateCodeGroup")
        .filter((i) => !testingLoci.includes(i))
        .filter((i) => !NEW_LOCI_TESTING_ONLY_KEYS.includes(i))
        .map((i) => {
          if (customKeys.includes(i)) return null;
          return {
            Header: () => (
              <>
                <span>{i}</span>
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
                    marginLeft: "auto",
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
            Filter: Multi,
            filter: multiSelectFilter,
          };
        })
        .filter((i) => i && i.accessor !== "key");
    },
    [customColumns, customColumns2, testingLoci],
  );

  const columns = React.useMemo(
    () => [
      ...customColumns,
      ...getColumnsAccessor(tableData),
      ...customColumns2,
    ],
    [customColumns, customColumns2, tableData, getColumnsAccessor],
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

  const handleIsolateClick = (selectedItemAttr) => {
    setSelectedItem(selectedItemAttr);
  };

  const handleIsolateCodeClick = (selectedItem, isolateCodeItem) => {
    let newIsolateCodeGroup = [
      selectedItem.isolateCode,
      isolateCodeItem.isolateCode,
    ];
    if (!!isolateCodeItem?.isolateCodeGroup?.length) {
      newIsolateCodeGroup.push(...isolateCodeItem?.isolateCodeGroup);
    }
    if (!!selectedItem?.isolateCodeGroup?.length) {
      newIsolateCodeGroup.push(...selectedItem?.isolateCodeGroup);
    }

    const newIsolateCodeGroupUnique = newIsolateCodeGroup
      ? [...new Set(newIsolateCodeGroup)]
      : "";

    const groupKeys = extractions
      .filter((i) => newIsolateCodeGroupUnique.includes(i.isolateCode))
      .map((i) => i.key);

    groupKeys.forEach((groupKey) =>
      update(ref(db, EXTRACTIONS + groupKey), {
        isolateCodeGroup: newIsolateCodeGroupUnique,
      }),
    );
    setSelectedItem(false);
  };

  const codeItems = !selectedItem
    ? []
    : Object.values(
        /* todo, razeni az nakonec */
        extractions.reduce(
          (acc, cur) => Object.assign(acc, { [cur.isolateCode]: cur }),
          {},
        ),
      )
        .sort((a: any, b: any) => a.isolateCode?.localeCompare(b.isolateCode))
        .map((extractionItem: any, index) => {
          /* todo:not neccessary */
          const currentItem = extractions.find(
            (extraction) => extraction.key === selectedItem.key,
          );
          if (
            (currentItem?.isolateCodeGroup &&
              currentItem?.isolateCodeGroup.includes(
                extractionItem.isolateCode,
              )) ||
            currentItem?.isolateCode === extractionItem.isolateCode ||
            currentItem?.country !== extractionItem.country ||
            currentItem?.latitude !== extractionItem.latitude ||
            currentItem?.longitude !== extractionItem.longitude ||
            currentItem?.state !== extractionItem.state ||
            currentItem?.localityName !== extractionItem.localityName ||
            currentItem?.dateCollection !== extractionItem.dateCollection ||
            currentItem?.collector !== extractionItem.collector ||
            currentItem?.habitat !== extractionItem.habitat ||
            currentItem?.speciesOrig !== extractionItem.speciesOrig ||
            currentItem?.altitude !== extractionItem.altitude
          )
            return null;

          return (
            <div
              key={index}
              className="item"
              onClick={() => setShowGroupModal({ currentItem, extractionItem })}
            >
              {extractionItem.isolateCode}
            </div>
          );
        });

  return (
    <>
      {selectedItem && (
        <div className="side-panel">
          <div className="body">
            <h5>Isolate codes</h5>
            <div className="items">{codeItems}</div>

            <button
              className="btn cancel-btn"
              type="button"
              onClick={() => setSelectedItem(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
      <div
        className="table-container"
        style={{
          height: `80vh`,
          overflow: "auto",
        }}
      >
        {showRemoveModal && (
          <ConfirmModal
            title={`Do you want to continue? ${showRemoveModal} will be removed from group`}
            onConfirm={() => {
              removeIsolateFromGroup(showRemoveModal);
              toast.success("Remove was successful");
              setShowRemoveModal(null);
            }}
            onHide={() => setShowRemoveModal(null)}
          />
        )}
        {showGroupModal && (
          <ConfirmModal
            title="Do you want to continue?"
            description={`Do you want to add ${showGroupModal.extractionItem.isolateCode} to ${showGroupModal.currentItem.isolateCode}?`}
            onConfirm={() => {
              handleIsolateCodeClick(
                showGroupModal.currentItem,
                showGroupModal.extractionItem,
              );
              setShowGroupModal(null);
              toast.success("Group was modified successfully");
            }}
            onHide={() => setShowGroupModal(null)}
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
                <th>Isolate group</th>
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()}>
            {rowsShow.map((row) => {
              prepareRow(row);

              const isolateCodeGroup =
                row.original.isolateCodeGroup &&
                Array.isArray(row.original.isolateCodeGroup)
                  ? row.original.isolateCodeGroup.map((i) => i)
                  : [];

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
                  <td className="sample-list">
                    {isolateCodeGroup.length > 1 &&
                      isolateCodeGroup.map((isolateCode) => (
                        <span key={isolateCode} className="sample">
                          {isolateCode}

                          <button
                            onClick={() => setShowRemoveModal(isolateCode)}
                          >
                            X
                          </button>
                        </span>
                      ))}
                    <span
                      className="sample add"
                      onClick={() => handleIsolateClick(row.original)}
                    >
                      + Add
                    </span>
                  </td>
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
            filename="PCR-genomic-loci.csv"
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

export default PcrGenomicLoci;
