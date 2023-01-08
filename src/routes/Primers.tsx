// @ts-nocheck

import { getDatabase, onValue, ref, remove, update } from "firebase/database";
import React, { useCallback, useEffect, useState } from "react";
import { CSVLink } from "react-csv";
import {
  useFilters,
  useGlobalFilter,
  useRowSelect,
  useSortBy,
  useTable,
} from "react-table";
import { toast } from "react-toastify";
import ConfirmModal from "../components/ConfirmModal";
import { GlobalFilter, Multi, multiSelectFilter } from "../components/Filter";
import IndeterminateCheckbox from "../components/IndeterminateCheckbox";
import { ReactComponent as ExportIcon } from "../images/export.svg";
import { PrimersType } from "../types";
import "./Table.scss";

const Primers: React.FC = () => {
  const [primers, setPrimers] = useState<PrimersType[]>([]);
  const [showModal, setShowModal] = useState(null);
  const db = getDatabase();

  useEffect(() => {
    onValue(ref(db, "primers/"), (snapshot) => {
      const items: any = [];
      snapshot.forEach((child) => {
        let childItem = child.val();
        childItem.key = child.key;
        items.push(childItem);
      });
      setPrimers(items);
    });
  }, [db]);

  const removeItem = (id: string) => {
    setShowModal(id);
  };

  const editItem = useCallback(
    (key: string, newValue: string, id: string) => {
      update(ref(db, "primers/" + key), {
        [id]: newValue,
      });
    },
    [db]
  );

  const columns = React.useMemo(
    () => [
      {
        Header: "Name",
        accessor: "name",
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "Marker",
        accessor: "marker",
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "Specificity",
        accessor: "specificity",
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "Sequence",
        accessor: "sequence",
        Filter: Multi,
        filter: multiSelectFilter,
      },

      {
        Header: "Author",
        accessor: "author",
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "Anneal T [°C]",
        accessor: "anneal",
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "Length of PCR product",
        accessor: "lengthPCR",
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "Work?",
        accessor: "work",
        Filter: Multi,
        filter: multiSelectFilter,
      },
      {
        Header: "Note on use",
        accessor: "noteOnUse",
        Filter: Multi,
        filter: multiSelectFilter,
      },
    ],
    []
  );

  const EditableCell: React.FC<any> = ({
    value: initialValue,
    row,
    cell,
    column: { id },
  }) => {
    const [value, setValue] = React.useState(initialValue);
    const onChange = (e: any) => {
      setValue(e.target.value);
    };
    const onBlur = (e: any) => {
      if (e.target.value)
        editItem(row.original.key, e.target.value, cell.column.id);
    };
    React.useEffect(() => {
      setValue(initialValue);
    }, [initialValue]);
    return <input value={value} onChange={onChange} onBlur={onBlur} />;
  };

  const tableInstance = useTable(
    {
      columns,
      data: primers,
      defaultColumn: { Cell: EditableCell, Filter: () => {} },
    },
    useGlobalFilter,
    useFilters,
    useSortBy,
    useRowSelect,
    (hooks) => {
      hooks.visibleColumns.push((columns) => [
        // Let's make a column for selection
        {
          id: "selection",
          // The header can use the table's getToggleAllRowsSelectedProps method
          // to render a checkbox
          Header: ({ getToggleAllRowsSelectedProps }) => (
            <div>
              <IndeterminateCheckbox {...getToggleAllRowsSelectedProps()} />
            </div>
          ),
          // The cell can use the individual row's getToggleRowSelectedProps method
          // to the render a checkbox
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
    state,
    rows,
    setGlobalFilter,
    preGlobalFilteredRows,
    selectedFlatRows,
    prepareRow,
  } = tableInstance;

  return (
    <>
      <div class="table-container">
        {showModal && (
          <ConfirmModal
            title="Do you want to continue?"
            onConfirm={() => {
              setShowModal(null);
              remove(ref(db, "primers/" + showModal));
              toast.success("Primer was removed successfully");
            }}
            onHide={() => setShowModal(null)}
          />
        )}
        <table className="table pcr" {...getTableProps()}>
          <thead>
            {headerGroups.map((headerGroup) => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                <th></th>
                {headerGroup.headers.map((column) => (
                  <th {...column.getHeaderProps(column.getSortByToggleProps())}>
                    {column.render("Header")}{" "}
                    <span>
                      {column.isSorted
                        ? column.isSortedDesc
                          ? " ⬇️"
                          : " ⬆️"
                        : ""}
                    </span>
                    <div className="filter-wrapper">
                      {column.canFilter ? column.render("Filter") : null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody {...getTableBodyProps()}>
            {rows.map((row) => {
              prepareRow(row);
              return (
                <tr {...row.getRowProps()} key={row.original.key}>
                  <td role="cell" className="remove">
                    <button onClick={() => removeItem(row.original.key)}>
                      X
                    </button>
                  </td>
                  {row.cells.map((cell) => {
                    return (
                      <td {...cell.getCellProps()}>{cell.render("Cell")}</td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>{" "}
      </div>
      <div className="controls">
        <GlobalFilter
          preGlobalFilteredRows={preGlobalFilteredRows}
          globalFilter={state.globalFilter}
          setGlobalFilter={setGlobalFilter}
        />
      </div>
      <div className="download">
        <CSVLink
          data={selectedFlatRows.map((i) => i.values)}
          filename="primers.csv"
        >
          <div className="export">
            <ExportIcon />
            export CSV
          </div>
        </CSVLink>
      </div>
    </>
  );
};

export default Primers;
