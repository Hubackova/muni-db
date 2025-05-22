// @ts-nocheck
import { getDatabase, ref, update } from "firebase/database";
import React, { useCallback, useMemo, useState } from "react";
import { CSVLink } from "react-csv";
import {
  Column,
  useFilters,
  useGlobalFilter,
  useRowSelect,
  useSortBy,
  useTable,
} from "react-table";
import {
  DateCell,
  EditableCell,
  EditableNoConfirmCell,
  SelectCell,
  customComparator,
  customLocalityComparator,
} from "../components/Cell";
import ConfirmModal from "../components/ConfirmModal";
import CreatableSelectInput from "../components/CreatableSelectInput";
import { GlobalFilter, Multi, multiSelectFilter } from "../components/Filter";
import IndeterminateCheckbox from "../components/IndeterminateCheckbox";
import { EXTRACTIONS } from "../constants";
import { getLocalityOptions } from "../helpers/getLocalityOptions";
import { ReactComponent as ExportIcon } from "../images/export.svg";

interface DnaExtractionsProps {
  storage: StorageType[];
  extractions: DnaExtractionsType[];
}

const All: React.FC<DnaExtractionsProps> = ({ storage, extractions }) => {
  const db = getDatabase();
  const localityOptions = useMemo(() => getLocalityOptions(extractions), []);
  const [full, setFull] = useState(false);
  const [last, setLast] = useState(false);

  const editItem = useCallback(
    (key: string, newValue: string, id: string) => {
      update(ref(db, EXTRACTIONS + key), {
        [id]: newValue,
      });
    },
    [db]
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
    [storage]
  );

  const boxOptionsWithEmpty = useMemo(
    () => [{ value: "", label: "-- empty --", storageSite: "" }, ...boxOptions],
    [boxOptions]
  );

  const handleRevert = () => {
    update(ref(db, EXTRACTIONS + last.rowKey), {
      [last.cellId]: last.initialValue,
    });
    last.setValue &&
      last.setValue({ value: last.initialValue, label: last.initialValue });
    setLast(false);
  };
  const DefaultCell = React.memo<React.FC<any>>(
    ({ value, row, cell }) => (
      <EditableCell
        initialValue={value}
        row={row}
        cell={cell}
        saveLast={setLast}
      />
    ),
    customComparator
  );

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
    customLocalityComparator
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
    customComparator
  );

  const customColumns: Column<any>[] = useMemo(
    () => [
      {
        Header: "Isolate code",
        accessor: "isolateCode",
        Cell: React.memo<React.FC<any>>(
          ({ row: { original } }) => (
            <input
              defaultValue={[original.isolateCode] || ""}
              disabled
              className="narrow"
            ></input>
          ),
          customComparator
        ),
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "Species (original det.)",
        accessor: "speciesOrig",
        Cell: React.memo<React.FC<any>>(
          ({ row: { original } }) => <span>{original.speciesOrig}</span>,
          customComparator
        ),

        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "Species, updated name",
        accessor: "speciesUpdated",
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "Locality code",
        accessor: "localityCode",
        Cell: React.memo<React.FC<any>>(
          ({ value: initialValue, row, cell, row: { original } }) => {
            const [showEditModal, setShowEditModal] = useState(null);
            const [value, setValue] = React.useState(
              original.localityCode
                ? {
                    value: original.localityCode,
                    label: original.localityCode,
                  }
                : null
            );
            const onChange = (value: any) => {
              setValue({
                value: value.value,
                label: value.value,
              });
              if (initialValue !== value.value) {
                setShowEditModal({
                  row,
                  newValue: value.value,
                  id: cell.column.id,
                  initialValue,
                  setValue: (value) =>
                    setValue({
                      value: value,
                      label: value,
                    }),
                  callback: () => {
                    editItem(original.key, value.value, "localityCode");
                    editItem(original.key, value.country || "", "country");
                    editItem(original.key, value.state || "", "state");
                    editItem(
                      original.key,
                      value.localityName || "",
                      "localityName"
                    );
                    editItem(original.key, value.latitude || "", "latitude");
                    editItem(original.key, value.longitude || "", "longitude");
                    editItem(original.key, value.altitude || "", "altitude");
                    editItem(original.key, value.habitat || "", "habitat");
                    editItem(
                      original.key,
                      value.dateCollection || "",
                      "dateCollection"
                    );
                    editItem(original.key, value.collector || "", "collector");
                    setLast({
                      rowKey: row.original.key,
                      cellId: cell.column.id,
                      initialValue,
                    });
                  },
                });
              }
            };

            return (
              <>
                <CreatableSelectInput
                  options={localityOptions}
                  value={value}
                  onChange={onChange}
                  isSearchable
                  className="narrow"
                />
                {showEditModal?.row.id === cell.row.id &&
                  showEditModal.id === cell.column.id && (
                    <ConfirmModal
                      title={`Do you want to change value from ${
                        showEditModal.initialValue || "<empty>"
                      } to ${showEditModal.newValue} ?`}
                      onConfirm={async () => {
                        await showEditModal.callback();
                        setShowEditModal(null);
                        toast.success("Field was edited successfully");
                      }}
                      onCancel={() => {
                        showEditModal.setValue(showEditModal.initialValue);
                      }}
                      onHide={() => setShowEditModal(null)}
                    />
                  )}
              </>
            );
          },
          customComparator
        ),
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
        Header: "Latitude [°N]",
        accessor: "latitude",

        Cell: LocalityCell,
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "Longitude [°E]",
        accessor: "longitude",
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
        Header: "Habitat",
        accessor: "habitat",
        Cell: LocalityCell,
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "Altitude [m a.s.l.]",
        accessor: "altitude",
        Cell: LocalityCell,
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "Date collection",
        accessor: "dateCollection",
        Cell: LocalityCell,
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "Collector",
        accessor: "collector",
        Cell: LocalityCell,
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "Project",
        accessor: "project",
        Filter: Multi,
        filter: multiSelectFilter,
        Cell: NoConfirmCell,
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
              confirm={false}
            />
          ),
          customComparator
        ),
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "ng/ul",
        accessor: "ngul",
        Cell: React.memo<React.FC<any>>(
          ({ value, row, cell }) => (
            <EditableNoConfirmCell
              initialValue={value}
              row={row}
              cell={cell}
              type="number"
              step=".00001"
              saveLast={setLast}
            />
          ),
          customComparator
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
    [boxOptions, editItem, localityOptions]
  );

  const customColumns2: Column<any>[] = useMemo(
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
        Header: "Status",
        accessor: "status",
        Cell: NoConfirmCell,
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "Box name",
        accessor: "box2",
        Cell: ({ row: { original } }) => {
          return <span>{original?.box}</span>;
        },
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
    ],
    []
  );

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
    [extractions, storage]
  );

  const getColumnsAccessor = useCallback(
    (tableData) => {
      if (!tableData || !tableData.length) return [];
      const customKeys = [...customColumns, ...customColumns2].map(
        (i) => i.accessor
      );
      const tableDataKeys = Object.keys(tableData[0]);
      return tableDataKeys
        .filter((i) => i !== "isolateCodeGroup")
        .map((i) => {
          if (customKeys.includes(i)) return null;
          return {
            Header: i,
            accessor: i,
            Filter: Multi,
            filter: multiSelectFilter,
          };
        })
        .filter((i) => i && i.accessor !== "key");
    },
    [customColumns, customColumns2]
  );

  const columns = React.useMemo(
    () => [
      ...customColumns,
      ...getColumnsAccessor(tableData),
      ...customColumns2,
    ],
    [customColumns, customColumns2, getColumnsAccessor, tableData]
  );

  const tableInstance = useTable(
    {
      columns,
      data: tableData,
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
    }
  );
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    state,
    prepareRow,
    selectedFlatRows,
    setGlobalFilter,
    preGlobalFilteredRows,
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
        <table className="table all" {...getTableProps()}>
          <thead>
            {headerGroups.map((headerGroup, index) => (
              <tr {...headerGroup.getHeaderGroupProps()} key={index}>
                {headerGroup.headers.map((column) => (
                  <th key={column.id}>
                    <span
                      {...column.getHeaderProps(column.getSortByToggleProps())}
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

                    {column.canFilter ? column.render("Filter") : null}
                  </th>
                ))}
                <th>Isolate group</th>
              </tr>
            ))}
          </thead>

          <tbody {...getTableBodyProps()}>
            {rowsShow.map((row) => {
              prepareRow(row);

              const isolateCodeGroup = row.original.isolateCodeGroup
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
                    {isolateCodeGroup.map((i) => (
                      <span key={i} className="sample">
                        {i}
                      </span>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="controls">
        <div className="download">
          <CSVLink
            data={selectedFlatRows.map((i) => i.values)}
            filename="db-mollusca-all.csv"
          >
            <div className="export">
              <ExportIcon />
              export CSV
            </div>
          </CSVLink>
        </div>
        <GlobalFilter
          preGlobalFilteredRows={preGlobalFilteredRows}
          globalFilter={state.globalFilter}
          setGlobalFilter={setGlobalFilter}
        />
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

export default All;
