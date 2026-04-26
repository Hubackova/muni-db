// @ts-nocheck

import { getDatabase, onValue, ref } from "firebase/database";
import React, { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.scss";
import TopBar from "./components/TopBar";
import { EXTRACTIONS, LOCI_TESTING } from "./constants";
import routes from "./routes";
import All from "./routes/All";
import DnaExtractions from "./routes/DnaExtractions";
import Error404 from "./routes/Error404";
import HomePage from "./routes/HomePage";
import Locations from "./routes/Locations";
import NewLociTesting from "./routes/NewLociTesting";
import PcrGenomicLoci from "./routes/PcrGenomicLoci";
import PcrPrograms from "./routes/PcrPrograms";
import Primers from "./routes/Primers";
import Storage from "./routes/Storage";
import { DnaExtractionsType, StorageType } from "./types";

const App: React.FC = () => {
  const [storage, setStorage] = useState<StorageType[]>([]);
  const [extractions, setExtractions] = useState<DnaExtractionsType[]>([]);
  const [testingLoci, setTestingLoci] = useState<string[]>([]);
  const db = getDatabase();

  useEffect(() => {
    onValue(ref(db, EXTRACTIONS), (snapshot) => {
      const items: DnaExtractionsType[] = [];
      snapshot.forEach((child) => {
        let childItem = child.val();
        childItem.key = child.key;
        items.push(childItem);
      });
      setExtractions(items.reverse());
    });
    onValue(ref(db, "storage/"), (snapshot) => {
      const items: StorageType[] = [];
      snapshot.forEach((child) => {
        let childItem = child.val();
        childItem.key = child.key;
        items.push(childItem);
      });
      setStorage(items);
    });
    onValue(ref(db, LOCI_TESTING), (snapshot) => {
      const value = snapshot.val();
      setTestingLoci(Array.isArray(value) ? value.filter(Boolean) : []);
    });
  }, [db]);

  const sortedExtractions = extractions;

  return (
    <div>
      <TopBar />
      <ToastContainer />
      <div className="app-container">
        <Routes>
          <Route path={routes.home} element={<HomePage />} />
          <Route
            path={routes.dnaExtractions}
            element={
              extractions?.length > 0 && storage?.length > 0 ? (
                <DnaExtractions
                  storage={storage}
                  extractions={sortedExtractions}
                />
              ) : (
                <div> loading (or no data)</div>
              )
            }
          />
          <Route
            path={routes.pcrGenomicLoci}
            element={
              extractions?.length > 0 && storage?.length > 0 ? (
                <PcrGenomicLoci
                  storage={storage}
                  extractions={sortedExtractions}
                  testingLoci={testingLoci}
                />
              ) : (
                <div> loading (or no data)</div>
              )
            }
          />
          <Route
            path={routes.newLociTesting}
            element={
              extractions?.length > 0 && storage?.length > 0 ? (
                <NewLociTesting
                  storage={storage}
                  extractions={sortedExtractions}
                  testingLoci={testingLoci}
                />
              ) : (
                <div> loading (or no data)</div>
              )
            }
          />
          <Route
            path={routes.locations}
            element={
              extractions?.length > 0 && storage?.length > 0 ? (
                <Locations extractions={extractions} />
              ) : (
                <div> loading (or no data)</div>
              )
            }
          />
          <Route
            path={routes.storage}
            element={
              extractions?.length > 0 && storage?.length > 0 ? (
                <Storage storage={storage} extractions={extractions} />
              ) : (
                <div> loading (or no data)</div>
              )
            }
          />
          <Route
            path={routes.all}
            element={
              extractions?.length > 0 && storage?.length > 0 ? (
                <All storage={storage} extractions={sortedExtractions} />
              ) : (
                <div> loading (or no data)</div>
              )
            }
          />
          <Route path={routes.primers} element={<Primers />} />
          <Route path={routes.pcrPrograms} element={<PcrPrograms />} />
          <Route element={<Error404 returnUrl={routes.home} />} />
        </Routes>
      </div>
    </div>
  );
};

export default App;
