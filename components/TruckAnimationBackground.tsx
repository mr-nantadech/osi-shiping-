/* eslint-disable react/no-danger */
'use client';

import React, { useEffect } from 'react';
import type { VehiclePhase } from '@/types/animation';

const TruckAnimationBackground = ({ phase = 'idle' }: { phase?: VehiclePhase }) => {
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      body {
        background: #142274;
        overflow: hidden;
      }
      .loop-wrapper {
        margin: 0 auto;
        position: relative;
        display: block;
        width: 100vw;
        height: 250px;
        overflow: hidden;
        border-bottom: 3px solid #fff;
        color: #fff;
      }
      .mountain {
        position: absolute;
        right: -900px;
        bottom: -20px;
        width: 2px;
        height: 2px;
        box-shadow:
          0 0 0 50px #3b4a9b,
          60px 50px 0 70px #3b4a9b,
          90px 90px 0 50px #3b4a9b,
          250px 250px 0 50px #3b4a9b,
          290px 320px 0 50px #3b4a9b,
          320px 400px 0 50px #3b4a9b;
        transform: rotate(130deg);
        animation: mtn 20s linear infinite;
      }
      .hill {
        position: absolute;
        right: -900px;
        bottom: -50px;
        width: 400px;
        border-radius: 50%;
        height: 20px;
        box-shadow:
          0 0 0 50px #3b4a9b,
          -20px 0 0 20px #3b4a9b,
          -90px 0 0 50px #3b4a9b,
          250px 0 0 50px #3b4a9b,
          290px 0 0 50px #3b4a9b,
          620px 0 0 50px #3b4a9b;
        transform: translateX(180vw);
        animation: hill 14s 3s linear infinite;
      }
      .tree, .tree:nth-child(2), .tree:nth-child(3) {
        position: absolute;
        height: 100px;
        width: 35px;
        bottom: 0;
        background: url(https://s3-us-west-2.amazonaws.com/s.cdpn.io/130015/tree.svg) no-repeat;
      }
      .rock {
        margin-top: -17%;
        height: 2%;
        width: 2%;
        bottom: -2px;
        border-radius: 20px;
        position: absolute;
        background: #ddd;
        left: 50%;
        transform: translateX(120vw);
      }
      .vehicle {
        position: absolute;
        bottom: 0px;
        right: 50%;
        margin-right: -60px;
        width: 85px;
        height: 70px;
        pointer-events: none;
      }
      .vehicle-enter {
        animation: vehicleEnter 2.5s ease-out forwards;
      }
      .vehicle-exit {
        animation: vehicleExit 1.5s ease-in forwards;
      }
      .truck, .wheels {
        position: absolute;
        left: 0;
      }
      .truck {
        background: url(/logo/truck.png) no-repeat;
        background-size: contain;
        background-position: center;
        height: 60px;
        width: 85px;
        bottom: 0;
      }
      .truck:before {
        content: " ";
        position: absolute;
        width: 25px;
        box-shadow:
          -30px 28px 0 1.5px #fff,
           -35px 18px 0 1.5px #fff;
      }
      .wheels {
        background: url(https://s3-us-west-2.amazonaws.com/s.cdpn.io/130015/wheels.svg) no-repeat;
        height: 15px;
        width: 85px;
        bottom: 1px;
      }
      .tree  { animation: tree 3s 0.000s linear infinite; }
      .tree:nth-child(2)  { animation: tree2 2s 0.150s linear infinite; }
      .tree:nth-child(3)  { animation: tree3 8s 0.050s linear infinite; }
      .rock  { animation: rock 3s linear infinite; }
      .truck  { animation: truckBounce 3s ease infinite; }
      .wheels  { animation: truckBounce 3s ease infinite; }
      .truck:before { animation: wind 1.5s   0.000s ease infinite; }
      @keyframes tree {
        0%   { transform: translate(1350px); }
        50% {}
        100% { transform: translate(-50px); }
      }
      @keyframes tree2 {
        0%   { transform: translate(650px); }
        50% {}
        100% { transform: translate(-50px); }
      }
      @keyframes tree3 {
        0%   { transform: translate(2750px); }
        50% {}
        100% { transform: translate(-50px); }
      }
      @keyframes rock {
        0%   { transform: translateX(100vw); }
        50%  { transform: translateX(0); }
        100% { transform: translateX(-100vw); }
      }
      @keyframes truckBounce {
        0%   { transform: translateY(0px); }
        46%  { transform: translateY(0px); }
        50%  { transform: translateY(-6px); }
        54%  { transform: translateY(0px); }
        58%  { transform: translateY(-2px); }
        62%  { transform: translateY(0px); }
        100% { transform: translateY(0px); }
      }
      @keyframes vehicleEnter {
        0%   { transform: translateX(-180vw); }
        100% { transform: translateX(0); }
      }
      @keyframes vehicleExit {
        0%   { transform: translateX(0); }
        100% { transform: translateX(180vw); }
      }
      @keyframes wind {
        0%   {  }
        50%   { transform: translateY(3px) }
        100%   { }
      }
      @keyframes mtn {
        100% {
          transform: translateX(-2000px) rotate(130deg);
        }
      }
      @keyframes hill {
        0%   { transform: translateX(180vw); }
        25%  { transform: translateX(110vw); }
        50%  { transform: translateX(40vw); }
        75%  { transform: translateX(-30vw); }
        100% { transform: translateX(-180vw); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-8">
      <div className="loop-wrapper w-full">
        <div className="mountain"></div>
        <div className="hill"></div>
        <div className="tree"></div>
        <div className="tree"></div>
        <div className="tree"></div>
        <div className="rock"></div>
        <div className={`vehicle vehicle-${phase}`}>
          <div className="truck"></div>
          <div className="wheels"></div>
        </div>
      </div>
    </div>
  );
};

export default TruckAnimationBackground;
