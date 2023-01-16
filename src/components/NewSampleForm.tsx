import { getDatabase, onValue, ref } from "firebase/database";
import moment from "moment";
import React, { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import CreatableSelectInput from "../components/CreatableSelectInput";
import { backup } from "../content/all";
import { writeExtractionData } from "../firebase/firebase";
import { getLocalityOptions } from "../helpers/getLocalityOptions";
import { DnaExtractionsType, StorageType } from "../types";
import "./NewSampleForm.scss";
import SelectInput from "./SelectInput";
import TextInput from "./TextInput";

const NewSampleForm: React.FC = () => {
  const [storage, setStorage] = useState<StorageType[]>([]);
  const [extractions, setExtractions] = useState<DnaExtractionsType[]>([]);
  const [showModalLoc, setShowModalLoc] = useState(false);
  const [showModalCode, setShowModalCode] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const db = getDatabase();

  useEffect(() => {
    onValue(ref(db, "extractions/"), (snapshot) => {
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
    writeExtractionData(
      sampleData.ngul
        ? {
            ...sampleData,
            ngul: parseFloat(sampleData.ngul),
          }
        : { ...sampleData }
    );
    toast.success("Sample was added successfully");
  };

  const addItemsBackup = () => {
    backup.forEach((i: any) =>
      writeExtractionData({
        ...i,
        dateCollection: moment(i.dateCollection, "DD.MM.YYYY").format(
          "YYYY-MM-DD"
        ),
        dateIsolation: moment(i.dateIsolation, "DD.MM.YYYY").format(
          "YYYY-MM-DD"
        ),
        isolateCode: i.isolateCode.toString(),
        ngul: parseFloat(i.ngul) || "",
      })
    );
    toast.success("ok");
  };

  const {
    register,
    control,
    formState: { errors },
    setValue,
    handleSubmit,
    clearErrors,
    watch,
    getValues,
  } = useForm<DnaExtractionsType>({
    mode: "all",
  });

  const boxOptions = storage.map((i) => ({
    value: i.key,
    label: i.box,
    storageSite: i.storageSite,
  }));

  const localityOptions = getLocalityOptions(extractions);

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

  const speciesOptions = useMemo(
    () =>
      Object.values(
        extractions.reduce(
          (acc, cur) => Object.assign(acc, { [cur.speciesOrig]: cur }),
          {}
        )
      ).map((i: any) => ({
        value: i.speciesOrig,
        label: i.speciesOrig,
      })),
    [extractions]
  );

  const codeItems = Object.values(
    extractions.reduce(
      (acc, cur) => Object.assign(acc, { [cur.isolateCode]: cur }),
      {}
    )
  )
    .sort((a: any, b: any) => a.isolateCode.localeCompare(b.isolateCode))
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
          clearErrors("country");
          clearErrors("localityName");
          clearErrors("collector");
          clearErrors("project");
        }}
      >
        {i.isolateCode}
      </div>
    ));
  const isCodes = extractions.map((i) => i.isolateCode);

  return (
    <form className="form" onSubmit={handleSubmit(addItem)}>
      <h5>Add new sample:</h5>
      <div className="row">
        <div>
          <TextInput
            name="isolateCode"
            label="Isolate code"
            error={errors.isolateCode?.message}
            register={register}
            required="This field is required"
            validate={() =>
              !isCodes.includes(getValues("isolateCode")) ||
              "Duplicate isolateCode"
            }
          />
          <div>
            <button type="button" onClick={() => setShowModalCode(true)}>
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
      </div>
      <div className="row">
        <TextInput
          label="Project"
          name="project"
          required="This field is required"
          error={errors.project?.message}
          register={register}
        />
        <TextInput
          label="Date of Isolation"
          name="dateIsolation"
          error={errors.dateIsolation?.message}
          register={register}
          type="date"
        />
      </div>
      <div className="row">
        <TextInput
          label="ng/ul"
          name="ngul"
          error={errors.ngul?.message}
          register={register}
          type="number"
          step=".00001"
        />
        <TextInput
          label="Kit"
          name="kit"
          error={errors.kit?.message}
          register={register}
          required="This field is required"
        />
      </div>
      <div className="row">
        <Controller
          render={({ field: { onChange, value, name } }) => (
            <SelectInput
              options={boxOptions}
              value={value ? { value, label: name } : null}
              onChange={(e: any) => {
                onChange(e?.value);
                setValue("storageSite", e.storageSite);
              }}
              label="Box"
              error={errors.box?.message}
              isSearchable
            />
          )}
          control={control}
          name="box"
        />

        <TextInput
          label="Storage Site"
          name="storageSite"
          error={errors.storageSite?.message}
          register={register}
          disabled
        />
      </div>
      <div className="row">
        <div>
          <Controller
            render={({ field: { onChange, value } }) => (
              <CreatableSelectInput
                options={localityOptions}
                value={value ? { value, label: value } : null}
                onChange={(e: any) => {
                  onChange(e?.value);
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
                  clearErrors("country");
                  clearErrors("localityName");
                  clearErrors("collector");
                  e?.value ? setIsDisabled(true) : setIsDisabled(false);
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
            <button type="button" onClick={() => setShowModalLoc(true)}>
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
        <TextInput
          label="Country"
          name="country"
          error={errors.country?.message}
          required="This field is required"
          onBlur={() => {
            setValue("isolateCodeGroup", "");
          }}
          disabled={isDisabled}
          register={register}
        />
      </div>
      <div className="row">
        <TextInput
          label="Latitude [°N]"
          name="latitude"
          error={errors.latitude?.message}
          register={register}
          onBlur={() => {
            setValue("isolateCodeGroup", "");
          }}
          disabled={isDisabled}
        />
        <TextInput
          label="Longitude [°E]"
          name="longitude"
          error={errors.longitude?.message}
          register={register}
          onBlur={() => {
            setValue("isolateCodeGroup", "");
          }}
          disabled={isDisabled}
        />
      </div>
      <div className="row">
        <TextInput
          label="Altitude [m a.s.l.]"
          name="altitude"
          error={errors.altitude?.message}
          register={register}
          onBlur={() => {
            setValue("isolateCodeGroup", "");
          }}
          disabled={isDisabled}
        />
        <TextInput
          label="State/province"
          name="state"
          error={errors.state?.message}
          register={register}
          onBlur={() => {
            setValue("isolateCodeGroup", "");
          }}
          disabled={isDisabled}
        />
      </div>
      <div className="row">
        <TextInput
          label="Locality name"
          name="localityName"
          error={errors.localityName?.message}
          disabled={isDisabled}
          register={register}
          required="This field is required"
          onBlur={() => {
            setValue("isolateCodeGroup", "");
          }}
        />
        <TextInput
          label="Habitat"
          name="habitat"
          error={errors.habitat?.message}
          register={register}
          onBlur={() => {
            setValue("isolateCodeGroup", "");
          }}
          disabled={isDisabled}
        />
      </div>
      <div className="row">
        <TextInput
          label="Date collection"
          name="dateCollection"
          error={errors.dateCollection?.message}
          register={register}
          type="date"
          disabled={isDisabled}
        />
        <TextInput
          label="Collector"
          name="collector"
          error={errors.collector?.message}
          register={register}
          disabled={isDisabled}
          required="This field is required"
        />
      </div>
      <div className="row"></div>
      <button className="submit-btn" type="submit">
        Save
      </button>
      {
        <button
          className="submit-btn"
          type="button"
          onClick={() => addItemsBackup()}
        >
          Backup
        </button>
      }
    </form>
  );
};

export default NewSampleForm;
