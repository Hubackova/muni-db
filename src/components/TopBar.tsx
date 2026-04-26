// @ts-nocheck

import { get, getDatabase, ref } from "firebase/database";
import React from "react";
import { NavLink } from "react-router-dom";
import routes from "../routes";
import "./TopBar.scss";

const TopBar: React.FC = () => {
  const db = getDatabase();

  const handleDownload = async () => {
    const snapshot = await get(ref(db, "/"));
    const data = JSON.stringify(snapshot);
    const link = document.createElement("a");

    link.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(data)
    );
    link.setAttribute("download", "db-mollusca-backup.json");
    link.style.display = "none";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  };

  return (
    <div className="topbar">
      <NavLink
        to={routes.home}
        className={({ isActive }) =>
          isActive ? "topbar-item active" : "topbar-item"
        }
      >
        Add new
      </NavLink>
      <NavLink
        to={routes.dnaExtractions}
        className={({ isActive }) =>
          isActive ? "topbar-item active" : "topbar-item"
        }
      >
        DNA extractions
      </NavLink>
      <NavLink
        to={routes.pcrGenomicLoci}
        className={({ isActive }) =>
          isActive ? "topbar-item active" : "topbar-item"
        }
      >
        PCR Genomic Loci
      </NavLink>
      <NavLink
        to={routes.newLociTesting}
        className={({ isActive }) =>
          isActive ? "topbar-item active" : "topbar-item"
        }
      >
        New Loci Testing
      </NavLink>
      <NavLink
        to={routes.storage}
        className={({ isActive }) =>
          isActive ? "topbar-item active" : "topbar-item"
        }
      >
        Storage
      </NavLink>
      <NavLink
        to={routes.all}
        className={({ isActive }) =>
          isActive ? "topbar-item active" : "topbar-item"
        }
      >
        All
      </NavLink>
      <NavLink
        to={routes.primers}
        className={({ isActive }) =>
          isActive ? "topbar-item active" : "topbar-item"
        }
      >
        Primers
      </NavLink>
      <NavLink
        to={routes.pcrPrograms}
        className={({ isActive }) =>
          isActive ? "topbar-item active" : "topbar-item"
        }
      >
        PCR programs
      </NavLink>
      <NavLink
        to={routes.locations}
        className={({ isActive }) =>
          isActive ? "topbar-item active" : "topbar-item"
        }
      >
        Locations
      </NavLink>
      <button className="export" onClick={() => handleDownload()}>
        Export all
      </button>
    </div>
  );
};

export default TopBar;
