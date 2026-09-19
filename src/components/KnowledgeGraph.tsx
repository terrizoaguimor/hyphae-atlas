"use client";

import {useEffect, useRef} from "react";
import {gsap} from "gsap";
import * as THREE from "three";
import type {Locale} from "@/agent/modes";
import type {QueryMode} from "@/agent/report-schema";
import {uiCopy} from "@/i18n/copy";

const palettes: Record<QueryMode, {primary: number; secondary: number}> = {
  migration: {primary: 0xd8ef8b, secondary: 0xa8d6c4},
  capability: {primary: 0x91c7ff, secondary: 0xa8d6c4},
  claim: {primary: 0xf09a7f, secondary: 0xd8ef8b},
};

export function KnowledgeGraph({mode, locale, busy, contextLive = true}: {mode: QueryMode; locale: Locale; busy: boolean; contextLive?: boolean}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const copy = uiCopy[locale];

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 11);
    let renderer: THREE.WebGLRenderer;
    try {renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, powerPreference: "high-performance"});} catch {return;}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);
    const palette = palettes[mode];
    const positions = [new THREE.Vector3(-3.7, -.7, .2), new THREE.Vector3(-1.9, .9, -.2), new THREE.Vector3(0, 0, .6), new THREE.Vector3(1.9, -.7, -.1), new THREE.Vector3(3.7, .75, .25)];
    const nodes: THREE.Mesh[] = [];
    positions.forEach((position, index) => {
      const geometry = new THREE.IcosahedronGeometry(index === 2 ? .48 : .33, index === 2 ? 2 : 1);
      const material = new THREE.MeshStandardMaterial({color: index === 2 ? palette.primary : palette.secondary, roughness: .38, metalness: .12, emissive: index === 2 ? palette.primary : 0x10211d, emissiveIntensity: index === 2 ? .2 : .05});
      const node = new THREE.Mesh(geometry, material);
      node.position.copy(position); node.scale.setScalar(reducedMotion ? 1 : .01); group.add(node); nodes.push(node);
      if (index > 0) {
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([positions[index - 1], position]);
        const line = new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({color: 0xa8d6c4, transparent: true, opacity: .35}));
        group.add(line);
      }
    });

    const particlePositions = new Float32Array(180 * 3);
    for (let index = 0; index < 180; index++) {
      particlePositions[index * 3] = (Math.random() - .5) * 10;
      particlePositions[index * 3 + 1] = (Math.random() - .5) * 5;
      particlePositions[index * 3 + 2] = (Math.random() - .5) * 4;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({color: palette.secondary, size: .025, transparent: true, opacity: .45}));
    group.add(particles);

    scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    const light = new THREE.PointLight(palette.primary, 16, 20); light.position.set(1, 3, 5); scene.add(light);
    const timeline = reducedMotion ? null : gsap.timeline();
    timeline?.to(nodes.map((node) => node.scale), {x: 1, y: 1, z: 1, duration: .7, stagger: .12, ease: "back.out(1.8)"});
    if (!reducedMotion) nodes.forEach((node, index) => gsap.to(node.scale, {x: index === 2 ? 1.25 : 1.12, y: index === 2 ? 1.25 : 1.12, z: index === 2 ? 1.25 : 1.12, duration: 1.2 + index * .1, repeat: -1, yoyo: true, ease: "sine.inOut", delay: index * .18}));

    let pointerX = 0; let pointerY = 0; let frame: number | null = null;
    const onPointer = (event: PointerEvent) => {const rect = host.getBoundingClientRect(); pointerX = ((event.clientX - rect.left) / rect.width - .5) * .3; pointerY = ((event.clientY - rect.top) / rect.height - .5) * .2;};
    if (!reducedMotion) host.addEventListener("pointermove", onPointer);
    const resize = () => {const width = Math.max(host.clientWidth, 1); const height = Math.max(host.clientHeight, 1); renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); if (reducedMotion) renderer.render(scene, camera);};
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    const render = () => {group.rotation.y += (pointerX - group.rotation.y) * .035; group.rotation.x += (-pointerY - group.rotation.x) * .035; particles.rotation.y += busy ? .0028 : .0008; renderer.render(scene, camera); frame = window.requestAnimationFrame(render);};
    if (reducedMotion) renderer.render(scene, camera); else render();

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame); observer.disconnect(); if (!reducedMotion) host.removeEventListener("pointermove", onPointer); timeline?.kill(); gsap.killTweensOf(nodes.map((node) => node.scale));
      scene.traverse((object) => {if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {object.geometry.dispose(); const material = object.material; if (Array.isArray(material)) material.forEach((item) => item.dispose()); else material.dispose();}});
      renderer.dispose(); renderer.domElement.remove();
    };
  }, [mode, busy]);

  return (
    <div className={`knowledge-graph graph-${mode} ${busy ? "is-busy" : ""}`}>
      <div className="graph-canvas" ref={hostRef} aria-hidden="true"/>
      <p className="sr-only">{copy.graphDescription}</p>
      <div className="graph-stage-list">{copy.graphStages.map((stage, index) => <span key={stage}><i>{index + 1}</i>{index === 2 && !contextLive ? (locale === "es" ? "Preview dataset" : "Dataset preview") : stage}</span>)}</div>
    </div>
  );
}
