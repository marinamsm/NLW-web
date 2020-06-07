import React, { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { Link, useHistory } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { Map, TileLayer, Marker, Popup } from "react-leaflet";
import { LeafletMouseEvent } from "leaflet";
import * as yup from 'yup';
import Dropzone from '../../components/Dropzone';
import axios from "axios";
import api from "../../services/api";

import "./styles.css";
import logo from "../../assets/logo.svg";

interface Item {
  id: "number";
  title: "string";
  imageUrl: "string";
}

interface UFIBGE {
  sigla: "string";
}

interface cityIBGE {
  nome: "string";
}

const CreatePoint = () => {
  const [file, setFile] = useState<File>();
  const [items, setItems] = useState<Item[]>([]);
  const [UFs, setUFs] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedUF, setSelectedUF] = useState<string>("0");
  const [selectedCity, setSelectedCity] = useState<string>("0");
  const [selectedMapPosition, setSelectedMapPosition] = useState<
    [number, number]
  >([0, 0]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [initialPosition, setinitialPosition] = useState<[number, number]>([
    0,
    0,
  ]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    whatsapp: "",
  });

  const history = useHistory();

  useEffect(() => {
    api.get("items").then((response) => {
      setItems(response.data);
    });
  }, [items]);

  useEffect(() => {
    const IBGEURL =
      "https://servicodados.ibge.gov.br/api/v1/localidades/estados";
    axios.get<UFIBGE[]>(IBGEURL).then((response) => {
      const UFInitials = response.data.map((uf) => uf.sigla);
      setUFs(UFInitials);
    });
  }, []);

  useEffect(() => {
    const IBGEURL = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedUF}/municipios`;
    axios.get<cityIBGE[]>(IBGEURL).then((response) => {
      const cities = response.data.map((uf) => uf.nome);
      setCities(cities);
    });
  }, [selectedUF]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      setinitialPosition([latitude, longitude]);
      setSelectedMapPosition([latitude, longitude]);
    });
  }, []);

  function handleUFSelection(event: ChangeEvent<HTMLSelectElement>) {
    const uf = event.target.value;
    setSelectedUF(uf);
  }

  function handleCitySelection(event: ChangeEvent<HTMLSelectElement>) {
    const city = event.target.value;
    setSelectedCity(city);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setFormData({ ...formData, [name]: value });
  }

  function handleMapClick(event: LeafletMouseEvent) {
    setSelectedMapPosition([event.latlng.lat, event.latlng.lng]);
    // console.log("--------", selectedMapPosition);
  }

  function handleSelectedItem(id: number) {
    const repeatedItem = selectedItems.includes(id);

    if (repeatedItem) {
      const filteredItens = selectedItems.filter(item => item !== id);
      setSelectedItems(filteredItens);
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  }

  async function handleSubmitEvent(event: FormEvent) {
    event.preventDefault();
    const { name, email, whatsapp } = formData;
    const items = selectedItems;
    const uf = selectedUF;
    const city = selectedCity;
    const [ latitude, longitude ] = selectedMapPosition;

    const dataJSON = {
      name, email, whatsapp, uf, city, latitude: String(latitude), longitude: String(longitude), items: items.join(',')
    }

    const schema = yup.object().shape({
      name: yup.string().required(),
      email: yup.string().required().email(),
      uf: yup.string().required(),
      city: yup.string().required(),
      whatsapp: yup.string().required()
    });

    schema.validate(dataJSON, { abortEarly: false }).catch(function(error: yup.ValidationError) {
      // error.name; // => 'ValidationError'
      // error.errors; // => ['age must be a number']
      alert(`Campos inválidos!: ${error.errors}`);
      return;
    });

    function hasKey<O>(obj: O, key: keyof any): key is keyof O {
      return key in obj
    }

    const data = new FormData();

    for(const key in dataJSON) {
      if (hasKey(dataJSON, key)) {
        data.append(key, dataJSON[key]);
      }
    }

    if (file) {
      data.append('image', file);
    }

    await api.post('points', data);

    alert('Ponto de coleta criado!');

    history.push('/');
  }

  return (
    <div id="page-create-point">
      <header>
        <img src={logo} alt="Logo da Ecoleta" />

        <Link to="/">
          <FiArrowLeft />
          Voltar para a home
        </Link>
      </header>

      <form onSubmit={handleSubmitEvent}>
        <h1>
          Cadastro do <br /> ponto de coleta
        </h1>
        <Dropzone onFileUploaded={setFile} />
        <fieldset>
          <legend>
            <h2>Dados</h2>
          </legend>

          <div className="field">
            <label htmlFor="name">Nome da Entidade</label>
            <input
              type="text"
              name="name"
              id="name"
              onChange={handleInputChange}
            />
          </div>
          <div className="field-group">
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input
                type="text"
                name="email"
                id="email"
                onChange={handleInputChange}
              />
            </div>
            <div className="field">
              <label htmlFor="whatsapp">Whatsapp</label>
              <input
                type="text"
                name="whatsapp"
                id="whatsapp"
                onChange={handleInputChange}
              />
            </div>
          </div>
        </fieldset>
        <fieldset>
          <legend>
            <h2>Endereço</h2>
            <span>Selecione o endereço no mapa</span>
          </legend>
          <Map center={initialPosition} zoom={15} onClick={handleMapClick}>
            <TileLayer
              attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={selectedMapPosition}>
              <Popup>
                A pretty CSS3 popup. <br /> Easily customizable.
              </Popup>
            </Marker>
          </Map>
          <div className="field-group">
            <div className="field">
              <label htmlFor="uf">UF</label>
              <select
                name="uf"
                id="uf"
                onChange={handleUFSelection}
                value={selectedUF}
              >
                {UFs.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="city">Cidade</label>
              <select
                name="city"
                id="city"
                value={selectedCity}
                onChange={handleCitySelection}
              >
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>
        <fieldset>
          <legend>
            <h2>Itens de Coleta</h2>
            <span>Selecione um ou mais itens abaixo</span>
          </legend>
          <ul className="items-grid">
            {items.map((item) => (
              <li
                key={item.id}
                onClick={() => handleSelectedItem(parseInt(item.id))}
                className={selectedItems.includes(parseInt(item.id)) ? "selected" : ""}
              >
                <img
                  src={item.imageUrl}
                  alt={`Imagem do item ${item.title}`}
                ></img>
                <span>{item.title}</span>
              </li>
            ))}
          </ul>
        </fieldset>
        <button type="submit">Cadastrar Ponto de Coleta</button>
      </form>
    </div>
  );
};

export default CreatePoint;
