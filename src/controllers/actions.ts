import { Request, Response } from 'express';
import CriminalCaseModel from '../models/CriminalCase';
import PrisonerModel, {
  TypeDecision, Sentence, Incarceration, Prevention, FinalDischarge, SentenceReduction,
} from '../models/Prisoner';
import datesAreOnSameDay from './util';

interface BodyReqInc {
  decision : {
    type: string,
    dateOfDecision: string,
  }
  dateOfIncarceration: string,
  motiveLabel: string,
}

interface ParsedBodyReqInc {
  decision : Incarceration,
  dateOfIncarceration : Date,
  motiveLabel : string,
}

const isBodyReqInc = (body: any): body is ParsedBodyReqInc => {
  const inc = body as BodyReqInc;
  return inc && inc.decision && inc.decision.type === TypeDecision.INC
    && !Number.isNaN(Date.parse(inc.decision.dateOfDecision))
    && !Number.isNaN(Date.parse(inc.dateOfIncarceration))
    && inc.motiveLabel !== undefined;
};

export const placeInIncarceration = (req: Request, res: Response) : void => {
  if (isBodyReqInc(req.body)) {
    const reqBody :ParsedBodyReqInc = req.body;
    const prisonerPromise = PrisonerModel.findOne({
      prisonFileNumber: req.params.prisonFileNumber,
    });
    const criminalCasePromise = CriminalCaseModel.findOne({
      criminalCaseNumber: req.params.criminalCaseNumber,
    });

    Promise.all([prisonerPromise, criminalCasePromise]).then((values) => {
      if (values.every((value) => value)) {
        const [prisoner, criminalCase] = [values[0]!, values[1]!];
        if (prisoner.decision.every((decision) => decision.type !== TypeDecision.INC)) {
          if (!prisoner.criminalCase.includes(criminalCase.criminalCaseNumber)) {
            prisoner.criminalCase.unshift(criminalCase.criminalCaseNumber);
          }
          if (!criminalCase.prisoner.includes(prisoner.prisonFileNumber)) {
            criminalCase.prisoner.push(prisoner.prisonFileNumber);
          }
          prisoner.decision.push(reqBody.decision);
          prisoner.dateOfIncarceration = reqBody.dateOfIncarceration;
          Promise.all([prisoner.save(), criminalCase.save()])
            .then(() => res.status(200).json({ message: `Prisoner ${prisoner.prisonFileNumber} is incarcerate for criminal case ${criminalCase.criminalCaseNumber}` }))
            .catch((error) => res.status(400).json({ error }));
        } else res.status(403).json({ error: `Prisoner ${prisoner.prisonFileNumber} is already incarcerate` });
      } else if (!values[0]) res.status(404).json({ error: 'Prisoner not found' });
      else if (!values[1]) res.status(404).json({ error: 'CriminalCase not found' });
    }).catch((error) => res.status(400).json({ error }));
  } else res.status(403).json({ error: 'Request body is not conform to an Incarceration body' });
};

interface BodyReqPre {
  decision : {
    type: string,
    dateOfDecision: string,
  }
}

interface ParsedBodyReqPre { decision : Prevention }

const isBodyReqPre = (body: any): body is ParsedBodyReqPre => {
  const pre = body as BodyReqPre;
  return pre && pre.decision && pre.decision.type === TypeDecision.PRE
    && !Number.isNaN(Date.parse(pre.decision.dateOfDecision));
};

export const placeInPreventive = (req: Request, res: Response) : void => {
  if (isBodyReqPre(req.body)) {
    const reqBody : ParsedBodyReqPre = req.body;
    const prisonerPromise = PrisonerModel.findOne({
      prisonFileNumber: req.params.prisonFileNumber,
    });
    const criminalCasePromise = CriminalCaseModel.findOne({
      criminalCaseNumber: req.params.criminalCaseNumber,
    });

    Promise.all([prisonerPromise, criminalCasePromise]).then((values) => {
      if (values.every((value) => value)) {
        const [prisoner, criminalCase] = [values[0]!, values[1]!];
        if (prisoner.decision.every((decision) => decision.type !== TypeDecision.INC
        && decision.type !== TypeDecision.PRE)) {
          if (!prisoner.criminalCase.includes(criminalCase.criminalCaseNumber)) {
            prisoner.criminalCase.unshift(criminalCase.criminalCaseNumber);
          }
          if (!criminalCase.prisoner.includes(prisoner.prisonFileNumber)) {
            criminalCase.prisoner.push(prisoner.prisonFileNumber);
          }
          prisoner.decision.push(reqBody.decision);
          Promise.all([prisoner.save(), criminalCase.save()])
            .then(() => res.status(200).json({ message: `Prisoner ${prisoner.prisonFileNumber} is in preventive for criminal case ${criminalCase.criminalCaseNumber}` }))
            .catch((error) => res.status(400).json({ error }));
        } else res.status(403).json({ error: `Prisoner ${prisoner.prisonFileNumber} is already incarcerate or in preventive` });
      } else if (!values[0]) res.status(404).json({ error: 'Prisoner not found' });
      else if (!values[1]) res.status(404).json({ error: 'CriminalCase not found' });
    }).catch((error) => res.status(400).json({ error }));
  } else res.status(403).json({ error: 'Request body is not conform to an Preventive body' });
};

interface BodyReqSen {
  decision: {
    type: string,
    dateOfDecision: string,
    duration: string,
  }
}

interface ParsedBodyReqSen { decision : Sentence }

const isBodyReqSen = (body: any): body is ParsedBodyReqSen => {
  const stc = body as BodyReqSen;
  return stc && stc.decision && stc.decision.type === TypeDecision.SEN
    && !Number.isNaN(parseInt(stc.decision.duration, 10))
    && !Number.isNaN(Date.parse(stc.decision.dateOfDecision));
};

export const addSentence = (req: Request, res: Response) => {
  if (isBodyReqSen(req.body)) {
    const sentence: Sentence = req.body.decision;
    PrisonerModel.findOne({ prisonFileNumber: req.params.prisonFileNumber })
      .then((prisoner) => {
        if (prisoner) {
          const { type, dateOfDecision } = sentence;
          const noDecAlreadyTaken = prisoner.decision.every((dec) => dec.type !== TypeDecision.SEN
          || !datesAreOnSameDay(new Date(dec.dateOfDecision), new Date(dateOfDecision)));
          if (noDecAlreadyTaken) {
            prisoner.decision.push(sentence);
            prisoner.save()
              .then(() => res.status(200).json({ message: `Decision of ${type} has been taken for Prisoner ${prisoner.prisonFileNumber} the ${dateOfDecision}` }))
              .catch((error) => res.status(400).json({ error }));
          } else res.status(403).json({ error: `Decision of ${type} has already been taken for Prisoner ${prisoner.prisonFileNumber} the same day` });
        } else res.status(404).json({ error: 'Prisoner not found' });
      }).catch((error) => res.status(400).json({ error }));
  } else res.status(403).json({ error: 'Request body is not conform to a Sentence body' });
};

interface BodyReqFin {
  decision: {
    type: string,
    dateOfDecision: string,
    dateOfFinalDischarge: string,
  }
}

interface ParsedBodyReqFin { decision : FinalDischarge }

const isBodyReqFin = (body: any): body is ParsedBodyReqFin => {
  const fin = body as BodyReqFin;
  return fin && fin.decision && fin.decision.type === TypeDecision.FIN
    && !Number.isNaN(Date.parse(fin.decision.dateOfDecision))
    && !Number.isNaN(Date.parse(fin.decision.dateOfFinalDischarge));
};

export const addFinalDischarge = (req: Request, res: Response) => {
  if (isBodyReqFin(req.body)) {
    const finalDisc: FinalDischarge = req.body.decision;
    PrisonerModel.findOne({ prisonFileNumber: req.params.prisonFileNumber })
      .then((prisoner) => {
        if (prisoner) {
          const { type, dateOfDecision } = finalDisc;
          const noDecAlreadyTaken = prisoner.decision.every((dec) => dec.type !== TypeDecision.FIN
          || !datesAreOnSameDay(new Date(dec.dateOfDecision), new Date(dateOfDecision)));
          if (noDecAlreadyTaken) {
            prisoner.decision.push(finalDisc);
            prisoner.save()
              .then(() => res.status(200).json({ message: `Decision of ${type} has been taken for Prisoner ${prisoner.prisonFileNumber} the ${dateOfDecision}` }))
              .catch((error) => res.status(400).json({ error }));
          } else res.status(403).json({ error: `Decision of ${type} has already been taken for Prisoner ${prisoner.prisonFileNumber} the same day` });
        } else res.status(404).json({ error: 'Prisoner not found' });
      }).catch((error) => res.status(400).json({ error }));
  } else res.status(403).json({ error: 'Request body is not conform to a Final Discharge body' });
};

interface BodyReqRed {
  decision: {
    type: string,
    dateOfDecision: string,
    duration: string,
  }
}

interface ParsedBodyReqRed { decision : SentenceReduction }

const isBodyReqRed = (body: any): body is ParsedBodyReqRed => {
  const red = body as BodyReqRed;
  return red && red.decision && red.decision.type === TypeDecision.RED
    && !Number.isNaN(Date.parse(red.decision.dateOfDecision))
    && !Number.isNaN(parseInt(red.decision.duration, 10));
};

export const addSentenceReduction = (req: Request, res: Response) => {
  if (isBodyReqRed(req.body)) {
    const sentReduc: SentenceReduction = req.body.decision;
    PrisonerModel.findOne({ prisonFileNumber: req.params.prisonFileNumber })
      .then((prisoner) => {
        if (prisoner) {
          const { type, dateOfDecision } = sentReduc;
          const noDecAlreadyTaken = prisoner.decision.every((dec) => dec.type !== TypeDecision.RED
          || !datesAreOnSameDay(new Date(dec.dateOfDecision), new Date(dateOfDecision)));
          if (noDecAlreadyTaken) {
            prisoner.decision.push(sentReduc);
            prisoner.save()
              .then(() => res.status(200).json({ message: `Decision of ${type} has been taken for Prisoner ${prisoner.prisonFileNumber} the ${dateOfDecision}` }))
              .catch((error) => res.status(400).json({ error }));
          } else res.status(403).json({ error: `Decision of ${type} has already been taken for Prisoner ${prisoner.prisonFileNumber} the same day` });
        } else res.status(404).json({ error: 'Prisoner not found' });
      }).catch((error) => res.status(400).json({ error }));
  } else res.status(403).json({ error: 'Request body is not conform to a Sentence Reduction body' });
};
