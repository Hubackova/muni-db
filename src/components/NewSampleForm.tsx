// @ts-nocheck
import { getDatabase, onValue, ref, update } from "firebase/database";
import moment from "moment";
import React, { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import CreatableSelectInput from "../components/CreatableSelectInput";
import { EXTRACTIONS } from "../constants";
import { backup } from "../content/all";
import { writeExtractionData } from "../firebase/firebase";
import { getLocalityOptions } from "../helpers/getLocalityOptions";
import { DnaExtractionsType, StorageType } from "../types";
import "./NewSampleForm.scss";
import SelectInput from "./SelectInput";
import TextInput from "./TextInput";

const FORM_DATA_KEY = "app_form_local_data";

const NewSampleForm: React.FC = () => {
  const [storage, setStorage] = useState<StorageType[]>([]);
  const [extractions, setExtractions] = useState<DnaExtractionsType[]>([]);
  const [showModalLoc, setShowModalLoc] = useState(false);
  const [showModalCode, setShowModalCode] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const db = getDatabase();

  /*   useEffect(() => {
    if (sessionStorage.getItem("alert") !== "true") {
      alert(
        "the database is undergoing construction and testing, please do not make any changes until this warning disappears"
      );
      sessionStorage.setItem("alert", "true");
    }
  }, []); */

  useEffect(() => {
    onValue(ref(db, EXTRACTIONS), (snapshot) => {
      const items: DnaExtractionsType[] = [];
      snapshot.forEach((child) => {
        let childItem = child.val();
        childItem.key = child.key;
        items.push(childItem);
      });
      setExtractions(items);
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
  }, [db]);

  const addItem = (data: any) => {
    const { storageSite, ...sampleData } = data;
    Object.keys(sampleData).forEach((key) => {
      if (sampleData[key] === undefined) {
        delete sampleData[key];
      }
    });

    let isolateGroupItem = sessionStorage.getItem("isolateGroupItem");
    if (isolateGroupItem) {
      try {
        isolateGroupItem = JSON.parse(isolateGroupItem);
      } catch (err) {
        console.log(err);
      }
    }

    let newIsolateCodeGroup = isolateGroupItem
      ? [isolateGroupItem.isolateCode, sampleData.isolateCode]
      : "";

    if (
      !!isolateGroupItem?.isolateCodeGroup?.length &&
      Array.isArray(isolateGroupItem?.isolateCodeGroup)
    ) {
      newIsolateCodeGroup.push(...isolateGroupItem?.isolateCodeGroup);
    }
    if (
      !!sampleData?.isolateCodeGroup?.length &&
      Array.isArray(sampleData?.isolateCodeGroup)
    ) {
      newIsolateCodeGroup.push(...sampleData?.isolateCodeGroup);
    }

    const newIsolateCodeGroupUnique = newIsolateCodeGroup
      ? [...new Set(newIsolateCodeGroup)]
      : "";

    writeExtractionData({
      ...sampleData,
      ngul: sampleData.ngul ? parseFloat(sampleData.ngul) : "",
      isolateCodeGroup: newIsolateCodeGroupUnique,
    });

    const groupKeys = extractions
      .filter((i) => newIsolateCodeGroupUnique.includes(i.isolateCode))
      .map((i) => i.key);

    if (!!newIsolateCodeGroupUnique.length) {
      groupKeys.forEach((i) =>
        update(ref(db, EXTRACTIONS + i), {
          isolateCodeGroup: newIsolateCodeGroupUnique,
        })
      );
    }
    sessionStorage.removeItem(FORM_DATA_KEY);
    toast.success("Sample was added successfully");
  };
  const addItemsBackup = () => {
    backup.forEach((i: any) => {
      const storageData = storage.find((storage) => storage.box === i.box);

      writeExtractionData({
        ...i,
        box: storageData?.key || "",
        dateCollection: moment(i.dateCollection, "DD.MM.YYYY").format(
          "YYYY-MM-DD"
        ),
        dateIsolation: moment(i.dateIsolation, "DD.MM.YYYY").format(
          "YYYY-MM-DD"
        ),
        isolateCode: i.isolateCode.toString(),
        isolateCodeGroup: i.isolateCodeGroup
          ? i.isolateCodeGroup.split(";")
          : "",
        ngul: parseFloat(i.ngul) || "",
      });
    });
    toast.success("ok");
  };

  const handleReset = () => {
    sessionStorage.removeItem(FORM_DATA_KEY);

    setValue("isolateCode", "");
    setValue("speciesOrig", "");
    setValue("speciesUpdated", "");
    setValue("project", "");
    setValue("dateIsolation", "");
    setValue("ngul", "");
    setValue("box", "");
    setValue("storageSite", "");
    setValue("localityCode", "");
    setValue("country", "");
    setValue("state", "");
    setValue("kit", "");
    setValue("localityName", "");
    setValue("latitude", "");
    setValue("longitude", "");
    setValue("altitude", "");
    setValue("habitat", "");
    setValue("dateCollection", "");
    setValue("collector", "");
    setValue("isolateCodeGroup", "");
  };

  const getSavedData = React.useCallback(() => {
    let data = sessionStorage.getItem(FORM_DATA_KEY);
    if (data) {
      // Parse it to a javaScript object
      try {
        data = JSON.parse(data);
      } catch (err) {
        console.log(err);
      }
      return data;
    }
    return {
      isolateCode: "",
      speciesOrig: "",
      speciesUpdated: "",
      project: "",
      dateIsolation: "",
      ngul: "",
      box: "",
      storageSite: "",
      localityCode: "",
      country: "",
      state: "",
      kit: "",
      localityName: "",
      latitude: "",
      longitude: "",
      altitude: "",
      habitat: "",
      dateCollection: "",
      collector: "",
      isolateCodeGroup: "",
    };
  }, []);

  const {
    register,
    control,
    formState: { errors },
    setValue,
    handleSubmit,
    clearErrors,
    watch,
    getValues,
  } = useForm<DnaExtractionsType | any>({
    mode: "all",
    defaultValues: getSavedData(),
  });

  const boxOptions = storage
    .map((i) => {
      return {
        value: i.key,
        label: i.box,
        storageSite: i.storageSite,
      };
    })
    .sort(function (a, b) {
      if (a.label < b.label) {
        return -1;
      }
      if (a.label > b.label) {
        return 1;
      }
      return 0;
    });

  const localityOptions = getLocalityOptions(extractions).sort(function (a, b) {
    if (a.label < b.label) {
      return -1;
    }
    if (a.label > b.label) {
      return 1;
    }
    return 0;
  });

  const locItems = useMemo(
    () =>
      localityOptions.map((i: any, index) => {
        if (!i.value) return null;
        return (
          <div
            key={index}
            className="item"
            onClick={() => {
              setValue("localityCode", i.value);
              setValue("country", i.country);
              setValue("state", i.state);
              setValue("localityName", i.localityName);
              setValue("latitude", i.latitude);
              setValue("longitude", i.longitude);
              setValue("altitude", i.altitude);
              setValue("habitat", i.habitat);
              setValue("dateCollection", i.dateCollection);
              setValue("collector", i.collector);
              clearErrors("country");
              clearErrors("localityName");
              clearErrors("collector");
            }}
          >
            {i.value}
          </div>
        );
      }),
    [clearErrors, localityOptions, setValue]
  );

  const getOptions = React.useCallback(
    (key: string) =>
      Object.values(
        extractions.reduce(
          /* @ts-ignore */
          (acc, cur) => Object.assign(acc, { [cur[key]]: cur }),
          {}
        )
      )
        .map((i: any) => ({
          value: i[key],
          label: i[key],
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
    [extractions]
  );
  const speciesOptions = getOptions("speciesOrig");

  const codeItems = Object.values(
    extractions.reduce(
      (acc, cur) => Object.assign(acc, { [cur.isolateCode]: cur }),
      {}
    )
  )
    .sort((a: any, b: any) => a.isolateCode?.localeCompare(b.isolateCode))
    .map((i: any, index) => (
      <div
        key={index}
        className="item"
        onClick={() => {
          setValue("speciesOrig", i.speciesOrig, {
            shouldValidate: true,
          });
          setValue("project", i.project);
          setValue("habitat", i.habitat);
          setValue("dateCollection", i.dateCollection);
          setValue("collector", i.collector);
          setValue("localityCode", i.localityCode);
          setValue("country", i.country, {
            shouldValidate: true,
          });
          setValue("state", i.state);
          setValue("localityName", i.localityName, {
            shouldValidate: true,
          });
          setValue("latitude", i.latitude);
          setValue("longitude", i.longitude);
          setValue("altitude", i.altitude);
          setValue("habitat", i.habitat);
          setValue("dateCollection", i.dateCollection);
          setValue("collector", i.collector, {
            shouldValidate: true,
          });
          setValue("isolateCodeGroup", i.isolateCode);

          /* do isolateGroup v sessionstorage nastaví celej zdrojovej vzorek */
          sessionStorage.setItem("isolateGroupItem", JSON.stringify(i));
          clearErrors("country");
          clearErrors("localityName");
          clearErrors("collector");
          clearErrors("project");
          if (i.localityCode) {
            setIsDisabled(true);
          } else setIsDisabled(false);
        }}
      >
        {i.isolateCode}
      </div>
    ));
  const isCodes = extractions.map((i) => i.isolateCode);

  React.useEffect(() => {
    /* uklada kompletni data z formu do sessionstorage */
    const subscription = watch((value) =>
      sessionStorage.setItem(FORM_DATA_KEY, JSON.stringify(value))
    );
    return () => subscription.unsubscribe();
  }, [watch]);

  return (
    <form className="form" onSubmit={handleSubmit(addItem)}>
      <div className="newformMenu">
        <h5>Add new sample:</h5>
        <button className="resetBtn" onClick={handleReset}>
          reset form
        </button>
      </div>
      <div className="form-grid">
        <div>
          <TextInput
            name="isolateCode"
            label="Isolate code"
            error={errors.isolateCode?.message}
            register={register}
            required="This field is required"
            validate={() =>
              !isCodes.includes(getValues("isolateCode").trim()) ||
              "Duplicate isolateCode"
            }
          />
          <div>
            <button
              type="button"
              onClick={() => setShowModalCode(true)}
              className="form-btn"
            >
              Show isolate codes
            </button>
            {watch("isolateCodeGroup") && (
              <span>{`(${watch("isolateCodeGroup")})`}</span>
            )}
            {showModalCode && (
              <div className="side-panel">
                <div className="body">
                  <h5>Isolate codes</h5>
                  <div className="items">{codeItems}</div>

                  <button
                    className="btn cancel-btn"
                    type="button"
                    onClick={() => setShowModalCode(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <Controller
          render={({ field: { onChange, value } }) => (
            <CreatableSelectInput
              options={speciesOptions}
              value={value ? { value, label: value } : null}
              onChange={(e: any) => {
                onChange(e?.value);
                setValue("isolateCodeGroup", "");
                sessionStorage.removeItem("isolateGroupItem");
              }}
              label="Species (original det.)"
              error={errors.speciesOrig?.message}
              isSearchable
              required="This field is required"
            />
          )}
          control={control}
          name="speciesOrig"
        />
        <Controller
          render={({ field: { onChange, value } }) => (
            <CreatableSelectInput
              options={getOptions("project")}
              value={value ? { value, label: value } : null}
              onChange={(e: any) => {
                onChange(e?.value);
              }}
              label="Project"
              error={errors.project?.message}
              isSearchable
              required="This field is required"
            />
          )}
          control={control}
          name="project"
        />
        <TextInput
          label="Date of isolation"
          name="dateIsolation"
          error={errors.dateIsolation?.message}
          register={register}
          type="date"
        />

        <TextInput
          label="ng/ul"
          name="ngul"
          error={errors.ngul?.message}
          register={register}
          type="number"
          step=".00001"
        />
        <Controller
          render={({ field: { onChange, value } }) => (
            <CreatableSelectInput
              options={getOptions("kit")}
              value={value ? { value, label: value } : null}
              onChange={(e: any) => {
                onChange(e?.value);
              }}
              label="Kit"
              error={errors.kit?.message}
              isSearchable
              required="This field is required"
            />
          )}
          control={control}
          name="kit"
        />
        <Controller
          render={({ field: { onChange, value } }) => {
            return (
              <SelectInput
                options={boxOptions}
                value={
                  value
                    ? {
                        value,
                        label: boxOptions.find((i) => i.value === value)?.label,
                      }
                    : null
                }
                onChange={(e: any) => {
                  onChange(e.value);
                  setValue("storageSite", e.storageSite);
                }}
                label="Box"
                error={errors.box?.message}
                isSearchable
              />
            );
          }}
          control={control}
          name="box"
        />

        <TextInput
          label="Storage site"
          name="storageSite"
          error={errors.storageSite?.message}
          register={register}
          disabled
        />
        <div>
          <Controller
            render={({ field: { onChange, value } }) => (
              <CreatableSelectInput
                options={localityOptions}
                value={value ? { value, label: value } : null}
                onChange={(e: any) => {
                  onChange(e?.value);

                  if (
                    e?.value &&
                    !!localityOptions.find((i: any) => i.value === e?.value)
                  ) {
                    setValue("country", e.country);
                    setValue("state", e.state);
                    setValue("localityName", e.localityName);
                    setValue("latitude", e.latitude);
                    setValue("longitude", e.longitude);
                    setValue("altitude", e.altitude);
                    setValue("habitat", e.habitat);
                    setValue("dateCollection", e.dateCollection);
                    setValue("collector", e.collector);
                    setValue("isolateCodeGroup", "");
                    sessionStorage.removeItem("isolateGroupItem");
                    clearErrors("country");
                    clearErrors("localityName");
                    clearErrors("collector");
                    setIsDisabled(true);
                  } else {
                    setIsDisabled(false);
                  }
                }}
                label="Locality code"
                error={errors.localityCode?.message}
                isSearchable
              />
            )}
            control={control}
            name="localityCode"
          />
          <div>
            <button
              type="button"
              onClick={() => setShowModalLoc(true)}
              className="form-btn"
            >
              Show localities
            </button>
            {showModalLoc && (
              <div className="side-panel">
                <div className="body">
                  <h5>Localities</h5>
                  <div className="items">{locItems}</div>
                  <button
                    className="btn cancel-btn"
                    type="button"
                    onClick={() => setShowModalLoc(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <Controller
          render={({ field: { onChange, value } }) => (
            <CreatableSelectInput
              options={getOptions("country")}
              value={value ? { value, label: value } : null}
              onChange={(e: any) => {
                if (e?.value !== getValues("country")) {
                  onChange(e?.value);
                  setValue("isolateCodeGroup", "");
                  sessionStorage.removeItem("isolateGroupItem");
                }
              }}
              label="Country"
              error={errors.country?.message}
              isSearchable
              required="This field is required"
              isDisabled={isDisabled}
            />
          )}
          control={control}
          name="country"
        />

        <TextInput
          label="Latitude [°N]"
          name="latitude"
          error={errors.latitude?.message}
          register={register}
          onBlur={(e: any) => {
            if (e.target.value !== getValues("latitude")) {
              setValue("isolateCodeGroup", "");
              sessionStorage.removeItem("isolateGroupItem");
            }
          }}
          disabled={isDisabled}
        />
        <TextInput
          label="Longitude [°E]"
          name="longitude"
          error={errors.longitude?.message}
          register={register}
          onBlur={(e: any) => {
            if (e.target.value !== getValues("longitude")) {
              setValue("isolateCodeGroup", "");
              sessionStorage.removeItem("isolateGroupItem");
            }
          }}
          disabled={isDisabled}
        />

        <TextInput
          label="Altitude [m a.s.l.]"
          name="altitude"
          error={errors.altitude?.message}
          register={register}
          onBlur={(e: any) => {
            if (e.target.value !== getValues("altitude")) {
              setValue("isolateCodeGroup", "");
              sessionStorage.removeItem("isolateGroupItem");
            }
          }}
          disabled={isDisabled}
        />
        <TextInput
          label="State/province"
          name="state"
          error={errors.state?.message}
          register={register}
          onBlur={(e: any) => {
            if (e.target.value !== getValues("state")) {
              setValue("isolateCodeGroup", "");
              sessionStorage.removeItem("isolateGroupItem");
            }
          }}
          disabled={isDisabled}
        />

        <TextInput
          label="Locality name"
          name="localityName"
          error={errors.localityName?.message}
          disabled={isDisabled}
          register={register}
          required="This field is required"
          onBlur={(e: any) => {
            if (e.target.value !== getValues("localityName")) {
              setValue("isolateCodeGroup", "");
              sessionStorage.removeItem("isolateGroupItem");
            }
          }}
        />
        <TextInput
          label="Habitat"
          name="habitat"
          error={errors.habitat?.message}
          register={register}
          onBlur={(e: any) => {
            if (e.target.value !== getValues("habitat")) {
              setValue("isolateCodeGroup", "");
              sessionStorage.removeItem("isolateGroupItem");
            }
          }}
          disabled={isDisabled}
        />

        <TextInput
          label="Date collection"
          name="dateCollection"
          error={errors.dateCollection?.message}
          register={register}
          type="date"
          disabled={isDisabled}
          onBlur={(e: any) => {
            if (e.target.value !== getValues("dateCollection")) {
              setValue("isolateCodeGroup", "");
              sessionStorage.removeItem("isolateGroupItem");
            }
          }}
        />
        <Controller
          render={({ field: { onChange, value } }) => (
            <CreatableSelectInput
              options={getOptions("collector")}
              value={value ? { value, label: value } : null}
              onChange={(e: any) => {
                if (e?.value !== getValues("collector")) {
                  onChange(e?.value);
                  setValue("isolateCodeGroup", "");
                  sessionStorage.removeItem("isolateGroupItem");
                }
              }}
              label="Collector"
              error={errors.collector?.message}
              isSearchable
              required="This field is required"
              isDisabled={isDisabled}
            />
          )}
          control={control}
          name="collector"
        />
      </div>
      <button className="submit-btn" type="submit">
        Save
      </button>
      {/* 
      <button
        className="submit-btn"
        type="button"
        onClick={() => addItemsBackup()}
      >
        Backup
      </button> */}
    </form>
  );
};

export default NewSampleForm;
